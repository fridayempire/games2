import { dailyPuzzles } from './data/dailyPuzzles'

function PuzzleDebug() {
  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>Puzzle Debug View</h1>
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: '20px'
      }}>
        {dailyPuzzles.map((puzzle, index) => (
          <div key={puzzle.id} style={{ 
            border: '1px solid #ccc',
            borderRadius: '8px',
            padding: '15px',
            backgroundColor: '#fff'
          }}>
            <h3>Puzzle #{puzzle.id}</h3>
            <img 
              src={puzzle.imageUrl} 
              alt={puzzle.answer}
              style={{ 
                width: '100%', 
                height: '200px',
                objectFit: 'cover',
                borderRadius: '4px'
              }}
            />
            <div style={{ marginTop: '10px' }}>
              <p><strong>Answer:</strong> {puzzle.answer}</p>
              <p><strong>Category:</strong> {puzzle.category}</p>
              <p><strong>Hint:</strong> {puzzle.hint}</p>
              <p><strong>Alternative Answers:</strong></p>
              <ul>
                {puzzle.alternativeAnswers.map((alt, i) => (
                  <li key={i}>{alt}</li>
                ))}
              </ul>
              <p><strong>Image URL:</strong></p>
              <input 
                type="text" 
                value={puzzle.imageUrl}
                readOnly
                style={{ 
                  width: '100%', 
                  padding: '5px',
                  fontSize: '12px',
                  wordBreak: 'break-all'
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default PuzzleDebug 