import React from 'react';
import './Hand.css'; // Make sure to create this CSS file

const Hand = ({ cards }) => {
  // Check if cards is an array and has items
  if (!Array.isArray(cards) || cards.length === 0) {
    return <div className="hand">No cards to display</div>;
  }

  return (
    <div className="hand">
      {cards.map((card, index) => (
        <img 
          key={index} 
          src={card.image} 
          alt={`${card.value} of ${card.suit}`} 
          className="card"
        />
      ))}
    </div>
  );
};

export default Hand;