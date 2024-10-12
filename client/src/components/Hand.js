import React from 'react';
import './Hand.css'; // Make sure to create this CSS file

const Hand = ({ cards }) => {
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