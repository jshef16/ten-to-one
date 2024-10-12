import React, { useState, useEffect, useCallback } from 'react';
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

  const sortCards = useCallback((cards) => {
    return cards.sort((a, b) => {
      const suitDiff = suitOrder.indexOf(a.suit) - suitOrder.indexOf(b.suit);
      if (suitDiff !== 0) return suitDiff;
      return valueOrder.indexOf(a.value) - valueOrder.indexOf(b.value);
    });
  }, []);

  const createNewDeck = useCallback(async () => {
    try {
      const response = await fetch('https://deckofcardsapi.com/api/deck/new/shuffle/?deck_count=1');
      const data = await response.json();
      console.log("New deck created:", data);
      return data.deck_id;
    } catch (error) {
      console.error("Error creating new deck:", error);
      return null;
    }
  }, []);

  const sendCardDataInChunks = useCallback(async (channel, cardData, chunkSize = 5) => {
    const { dealtCards, trumpCard, deckId, remaining } = cardData;
    const totalChunks = Math.ceil(dealtCards.length / chunkSize);

    for (let i = 0; i < totalChunks; i++) {
      const start = i * chunkSize;
      const end = start + chunkSize;
      const chunk = dealtCards.slice(start, end);

      await channel.sendEvent({
        type: 'cards-drawn-chunk',
        data: {
          chunkIndex: i,
          totalChunks: totalChunks,
          cards: chunk,
          deckId: deckId,
          remaining: remaining,
          trumpCard: i === totalChunks - 1 ? trumpCard : null // Send trump card with last chunk
        }
      });
    }
  }, []);

  const dealCards = useCallback(async (playerCount, deckId) => {
    if (deckId && channel) {
      try {
        console.log("Dealing cards...");
        const totalCards = playerCount * 10 + 1; // 10 cards per player + 1 trump card
        const response = await fetch(`https://deckofcardsapi.com/api/deck/${deckId}/draw/?count=${totalCards}`);
        const data = await response.json();
        
        if (!data.success) {
          throw new Error("Failed to draw cards from the deck");
        }

        console.log("Cards drawn:", data);

        const dealtCards = data.cards.slice(0, -1); // All cards except the last one
        const revealedTrumpCard = data.cards[data.cards.length - 1]; // The last card

        setTrumpCard(revealedTrumpCard);
        console.log("Trump card set:", revealedTrumpCard);

        // Prepare card data
        const cardData = {
          dealtCards: dealtCards.map(card => ({
            code: card.code,
            image: card.image,
            value: card.value,
            suit: card.suit
          })),
          trumpCard: {
            code: revealedTrumpCard.code,
            image: revealedTrumpCard.image,
            value: revealedTrumpCard.value,
            suit: revealedTrumpCard.suit
          },
          deckId: deckId,
          remaining: data.remaining
        };

        // Send card data in chunks
        await sendCardDataInChunks(channel, cardData);

      } catch (error) {
        console.error("Error fetching cards from API:", error);
      }
    } else {
      console.error("Cannot deal cards: deckId or channel is missing", { deckId, channelAvailable: !!channel });
    }
  }, [channel, sendCardDataInChunks]);

  const distributeCards = useCallback((allCards, playerCount, playerIndex) => {
    const playerCards = [];
    for (let i = 0; i < 10; i++) {
      playerCards.push(allCards[playerIndex + (i * playerCount)]);
    }
    return sortCards(playerCards);
  }, [sortCards]);

  useEffect(() => {
    console.log("useEffect triggered - gameStarted, players, deckId:", { gameStarted, playersCount: players.length, deckId });
    if (gameStarted && players.length > 0 && !deckId) {
      createNewDeck().then(newDeckId => {
        console.log("New deck created in useEffect:", newDeckId);
        setDeckId(newDeckId);
      });
    }
  }, [gameStarted, players.length, deckId, createNewDeck]);

  useEffect(() => {
    if (gameStarted && players.length > 0 && deckId) {
      // Only the first player (or a designated dealer) should call dealCards
      if (players[0].id === currentPlayerId) {
        dealCards(players.length, deckId);
      }
    }
  }, [gameStarted, players, deckId, currentPlayerId, dealCards]);

  useEffect(() => {
    if (channel) {
      const handleGameStarted = async (event) => {
        if (event.type === 'game-started') {
          console.log("Game started event received:", event);
          setGameStarted(true);
        }
      };

      const handleCardsDrawnChunk = (event) => {
        if (event.type === 'cards-drawn-chunk') {
          console.log("Cards drawn chunk received:", event);
          
          setPlayerCards(prevCards => {
            const newCards = [...prevCards, ...event.data.cards];
            if (event.data.chunkIndex === event.data.totalChunks - 1) {
              // Last chunk, set trump card and distribute cards
              setTrumpCard(event.data.trumpCard);
              setDeckId(event.data.deckId);
              
              const playerIndex = players.findIndex(player => player.id === currentPlayerId);
              if (playerIndex !== -1) {
                const myCards = distributeCards(newCards, players.length, playerIndex);
                return myCards; // Return the array of cards, not nested in another array
              }
            }
            return newCards;
          });
        }
      };

      channel.on('game-started', handleGameStarted);
      channel.on('cards-drawn-chunk', handleCardsDrawnChunk);

      return () => {
        channel.off('game-started', handleGameStarted);
        channel.off('cards-drawn-chunk', handleCardsDrawnChunk);
      };
    }
  }, [channel, players, currentPlayerId, distributeCards]);

  useEffect(() => {
    if (channel) {
      const members = Object.values(channel.state.members);
      const playerList = members.map((member) => ({
        id: member.user.id,
        name: member.user.name || member.user.id,
        score: 0,
      }));
      console.log("Setting players:", playerList);
      setPlayers(playerList);
    }
  }, [channel]);

  const startGame = async () => {
    if (channel) {
      console.log("Starting game...");
      try {
        await channel.sendEvent({
          type: 'game-started',
          data: { message: 'Game has started!' },
        });
        console.log("Game started event sent");
        setGameStarted(true);
      } catch (error) {
        console.error("Error sending game-started event:", error);
      }
    } else {
      console.error("Channel is not available");
    }
  };

  const currentPlayerIndex = players.findIndex((player) => player.id === currentPlayerId);
  console.log("Current player index:", currentPlayerIndex, "Current player ID:", currentPlayerId);

  return (
    <div className="gameContainer">
      <Board players={players} currentPlayerId={currentPlayerId} />
      
      {trumpCard && (
        <div className="trumpCard">
          <h3>Trump Card</h3>
          <img src={trumpCard.image} alt={`${trumpCard.value} of ${trumpCard.suit}`} />
        </div>
      )}

      {gameStarted && (
        <Hand cards={playerCards} />
      )}

      {!gameStarted && (
        <button onClick={startGame} disabled={!channel}>Start Game</button>
      )}

      <div>
        <h4>Debug Info:</h4>
        <p>Game Started: {gameStarted.toString()}</p>
        <p>Deck ID: {deckId}</p>
        <p>Players: {JSON.stringify(players)}</p>
        <p>Player Cards: {JSON.stringify(playerCards)}</p>
        <p>Current Player Index: {players.findIndex((player) => player.id === currentPlayerId)}</p>
      </div>
    </div>
  );
}

export default Game;