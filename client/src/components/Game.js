import React, { useState, useEffect } from 'react';
import Cookies from "universal-cookie";
import Hand from './Hand.js';
import Board from "./Board.js";

function Game({ channel, initialGameStarted }) {
  const [players, setPlayers] = useState([]);
  const [playerCards, setPlayerCards] = useState([]);
  const [trumpCard, setTrumpCard] = useState(null);
  const [gameStarted, setGameStarted] = useState(initialGameStarted);
  const [deckId, setDeckId] = useState(null);
  const cookies = new Cookies();
  const currentPlayerId = cookies.get("userId");

  const suitOrder = ['SPADES', 'HEARTS', 'CLUBS', 'DIAMONDS'];
  const valueOrder = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'JACK', 'QUEEN', 'KING', 'ACE'];

  const sortCards = (cards) => {
    return cards.sort((a, b) => {
      const suitDiff = suitOrder.indexOf(a.suit) - suitOrder.indexOf(b.suit);
      if (suitDiff !== 0) return suitDiff;
      return valueOrder.indexOf(a.value) - valueOrder.indexOf(b.value);
    });
  };

  const createNewDeck = async () => {
    try {
      const response = await fetch('https://deckofcardsapi.com/api/deck/new/shuffle/?deck_count=1');
      const data = await response.json();
      return data.deck_id;
    } catch (error) {
      console.error("Error creating new deck:", error);
      return null;
    }
  };

  const dealCards = async (playerCount, deckId) => {
    if (deckId && channel) {
      try {
        console.log("Dealing cards...");
        const totalCards = playerCount * 10;
        
        const response = await fetch(`https://deckofcardsapi.com/api/deck/${deckId}/draw/?count=${totalCards + 1}`);
        const data = await response.json();

        const cards = data.cards;
        
        const revealedTrumpCard = cards.pop();
        setTrumpCard(revealedTrumpCard);

        await channel.sendEvent({
          type: 'trump-revealed',
          data: { trumpCard: revealedTrumpCard },
        });

        const dealtCards = [];
        for (let i = 0; i < playerCount; i++) {
          const playerCards = cards.slice(i * 10, (i + 1) * 10);
          dealtCards.push(sortCards(playerCards));
        }

        setPlayerCards(dealtCards);
      } catch (error) {
        console.error("Error fetching cards from API:", error);
      }
    }
  };

  useEffect(() => {
    if (gameStarted && players.length > 0 && deckId) {
      dealCards(players.length, deckId);
    }
  }, [gameStarted, players, deckId, channel]);

  useEffect(() => {
    if (channel) {
      const members = Object.values(channel.state.members);
      const playerList = members.map((member) => ({
        id: member.user.id,
        name: member.user.name || member.user.id,
        score: 0,
      }));
      setPlayers(playerList);

      const handleGameStarted = async (event) => {
        if (event.type === 'game-started') {
          setGameStarted(true);
          setDeckId(event.data.deckId);
        }
      };

      const handleTrumpRevealed = (event) => {
        if (event.type === 'trump-revealed') {
          setTrumpCard(event.data.trumpCard);
        }
      };

      channel.on('game-started', handleGameStarted);
      channel.on('trump-revealed', handleTrumpRevealed);

      return () => {
        channel.off('game-started', handleGameStarted);
        channel.off('trump-revealed', handleTrumpRevealed);
      };
    }
  }, [channel]);

  const startGame = async () => {
    if (channel) {
      const newDeckId = await createNewDeck();
      setDeckId(newDeckId);

      try {
        await channel.sendEvent({
          type: 'game-started',
          data: { message: 'Game has started!', deckId: newDeckId },
        });
        setGameStarted(true);
      } catch (error) {
        console.error("Error sending game-started event:", error);
      }
    }
  };

  const currentPlayerIndex = players.findIndex((player) => player.id === currentPlayerId);

  return (
    <div className="gameContainer">
      <Board players={players} currentPlayerId={currentPlayerId} />
      
      {trumpCard && (
        <div className="trumpCard">
          <h3>Trump Card</h3>
          <img src={trumpCard.image} alt={`${trumpCard.value} of ${trumpCard.suit}`} />
        </div>
      )}

      {gameStarted && playerCards.length > 0 && currentPlayerIndex !== -1 && (
        <Hand cards={playerCards[currentPlayerIndex]} />
      )}

      {!gameStarted && (
        <button onClick={startGame}>Start Game</button>
      )}
    </div>
  );
}

export default Game;