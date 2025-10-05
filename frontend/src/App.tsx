import { useState } from 'react'

interface BookAvailability {
  title: string
  author: string
  isbn?: string
  library: string
  available: boolean
  format: string
  branch?: string
}

function App() {
  const [wishlistUrl, setWishlistUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [results, setResults] = useState<BookAvailability[]>([])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setResults([])

    try {
      const response = await fetch('/api/check-availability', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ wishlistUrl }),
      })

      if (!response.ok) {
        throw new Error('Failed to fetch availability')
      }

      const data = await response.json()
      setResults(data.books)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h1>Library Lookup</h1>
      <p>Check which books from your Amazon wishlist are available at local libraries</p>
      <p style={{ background: '#d1ecf1', padding: '10px', borderRadius: '4px', fontSize: '14px', color: '#0c5460' }}>
        <strong>Note:</strong> Full process may take several minutes for large wishlists:
        <br />• Fetching wishlist: ~60 seconds for 350+ books
        <br />• Searching libraries: ~2-3 seconds per book
        <br />• Example: 100 books ≈ 5-6 minutes total
      </p>

      <form onSubmit={handleSubmit}>
        <input
          type="url"
          placeholder="Enter Amazon Wishlist URL"
          value={wishlistUrl}
          onChange={(e) => setWishlistUrl(e.target.value)}
          required
          style={{ width: '400px' }}
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Checking...' : 'Check Availability'}
        </button>
      </form>

      {error && <div className="error">{error}</div>}

      {loading && <div className="loading">Processing... This may take several minutes for large wishlists. Check your terminal for progress.</div>}

      {results.length > 0 && (
        <>
          <h2>{results.length} books found in your wishlist</h2>
        </>
      )}

      {results.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Title</th>
              <th>Author</th>
              <th>Library</th>
              <th>Status</th>
              <th>Format</th>
              <th>Branch</th>
            </tr>
          </thead>
          <tbody>
            {results.map((book, index) => (
              <tr key={index}>
                <td>{book.title}</td>
                <td>{book.author}</td>
                <td>{book.library}</td>
                <td className={book.available ? 'available' : 'unavailable'}>
                  {book.available ? 'Available' : 'Not Available'}
                </td>
                <td>{book.format}</td>
                <td>{book.branch || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {!loading && !error && results.length === 0 && wishlistUrl && (
        <p>No books found in wishlist.</p>
      )}
    </div>
  )
}

export default App
