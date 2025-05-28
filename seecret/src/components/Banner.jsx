import React from 'react';

const Banner = ({ message, type = 'info' }) => {
  return (
    <div className={`banner ${type}`}>
      <p>{message}</p>
    </div>
  );
};

export default Banner; 