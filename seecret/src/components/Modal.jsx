import React from 'react';

const Modal = ({ isOpen = true, onClose, children, title }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>&times;</button>
        {title && (
          <div className="modal-header">
            <h2>{title}</h2>
          </div>
        )}
        {children}
      </div>
    </div>
  );
};

export default Modal; 