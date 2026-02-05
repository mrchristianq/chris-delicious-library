"use client";

/**
 * Cover Download Utility Page
 * Visit /download-covers to download all covers to GitHub
 */

import { useState } from 'react';
import Papa from 'papaparse';

export default function DownloadCoversPage() {
  const [status, setStatus] = useState<string>('Ready to download covers');
  const [progress, setProgress] = useState({ total: 0, current: 0, category: '' });
  const [downloadedCovers, setDownloadedCovers] = useState<Array<{ title: string, filename: string, url: string }>>([]);
  const [isDownloading, setIsDownloading] = useState(false);
  const [stats, setStats] = useState({ totalRows: 0, withCovers: 0, skipped: 0 });
  const [categoryStats, setCategoryStats] = useState<Record<string, { total: number, withCovers: number, wishlist: number }>>({});

  const cleanFilename = (title: string, id: number) => {
    if (!title) return `unknown-${id}`;
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 50);
  };

  const downloadCovers = async () => {
    setIsDownloading(true);
    setStatus('Starting download process...');
    const allCovers: Array<{ title: string, filename: string, url: string }> = [];
    let totalRows = 0;
    let skippedCount = 0;    const catStats: Record<string, { total: number, withCovers: number, wishlist: number }> = {};
    try {
      // Fetch all CSVs (these work client-side since you're authenticated)
      const categories = [
        { name: 'movies', url: process.env.NEXT_PUBLIC_MOVIES_SHEET_CSV_URL, posterKey: 'PosterURL' },
        { name: 'tv', url: process.env.NEXT_PUBLIC_TV_SHEET_CSV_URL, posterKey: 'PosterURL' },
        { name: 'books', url: process.env.NEXT_PUBLIC_BOOKS_SHEET_CSV_URL, posterKey: 'ImageURL' },
        { name: 'games', url: process.env.NEXT_PUBLIC_GAMES_SHEET_CSV_URL, posterKey: 'PosterURL' },
      ];

      for (const category of categories) {
        if (!category.url) continue;

        setProgress({ total: 0, current: 0, category: category.name });
        setStatus(`Fetching ${category.name} data...`);

        const response = await fetch(category.url);
        const csvText = await response.text();
        
        // Parse CSV with PapaParse
        const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });
        const data = parsed.data as any[];

        if (data.length === 0) {
          setStatus(`Skipping ${category.name} - no data found`);
          continue;
        }
        
        // Filter out rows without titles (empty or invalid rows)
        const validData = data.filter(row => {
          const title = row.Title || row.title;
          return title && title.trim() !== '' && title !== 'Title';
        });

        // Debug: Log columns and sample data for movies/tv
        if ((category.name === 'movies' || category.name === 'tv') && validData.length > 0) {
          console.log(`${category.name} columns:`, Object.keys(validData[0]));
          console.log(`First 3 ${category.name} rows:`, validData.slice(0, 3));
          console.log(`Total ${category.name} rows in CSV:`, data.length);
          console.log(`Valid ${category.name} rows (with titles):`, validData.length);
        }

        const total = validData.length;
        setProgress({ total, current: 0, category: category.name });
        
        catStats[category.name] = { total: validData.length, withCovers: 0, wishlist: 0 };

        for (let i = 0; i < validData.length; i++) {
          const row = validData[i];
          totalRows++;
          const title = row.Title || row.title;
          
          // For movies/tv: ONLY use PosterURL, ignore BackdropURL
          let posterUrl;
          if (category.name === 'movies' || category.name === 'tv') {
            posterUrl = row.PosterURL || row.posterURL;
          } else {
            posterUrl = row.PosterURL || row.posterURL || row.ImageURL || row.imageURL || row.CoverURL || row.coverURL;
          }
          
          // Check if it's a wishlist item
          const status = row.WatchStatus || row.PlayStatus || row.Status || '';
          const isWishlist = status.toLowerCase().includes('wishlist');
          if (isWishlist) {
            catStats[category.name].wishlist++;
          }

          if (!title || !posterUrl || posterUrl === 'N/A' || posterUrl.trim() === '') {
            skippedCount++;
            continue;
          }

          catStats[category.name].withCovers++;
          
          const filename = cleanFilename(title, i);
          const ext = posterUrl.includes('.webp') ? '.webp' : 
                     posterUrl.includes('.png') ? '.png' : '.jpg';

          allCovers.push({
            title,
            filename: `${category.name}/${filename}${ext}`,
            url: posterUrl
          });

          setProgress({ total, current: i + 1, category: category.name });
        }
      }

      setCategoryStats(catStats);
      setStats({ totalRows, withCovers: allCovers.length, skipped: skippedCount });
      setDownloadedCovers(allCovers);
      setStatus(`Found ${allCovers.length} covers out of ${totalRows} total items (${skippedCount} without covers)`);
      setProgress({ total: 0, current: 0, category: '' }); // Reset progress
      setIsDownloading(false);

    } catch (error) {
      setStatus(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setProgress({ total: 0, current: 0, category: '' }); // Reset progress
      setIsDownloading(false);
    }
  };

  const downloadJSON = () => {
    const json = JSON.stringify(downloadedCovers, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'covers-manifest.json';
    a.click();
  };

  return (
    <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto', color: '#333' }}>
      <h1 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '20px', color: '#000' }}>
        Cover Download Utility
      </h1>

      <div style={{ background: '#f5f5f5', padding: '20px', borderRadius: '8px', marginBottom: '20px', color: '#333' }}>
        <p style={{ marginBottom: '10px', color: '#333' }}><strong>Status:</strong> {status}</p>
        {stats.totalRows > 0 && (
          <div style={{ marginTop: '10px', padding: '10px', background: '#e3f2fd', borderRadius: '4px' }}>
            <p style={{ margin: '5px 0', color: '#333' }}><strong>Total Items:</strong> {stats.totalRows}</p>
            <p style={{ margin: '5px 0', color: '#2e7d32' }}><strong>With Covers:</strong> {stats.withCovers}</p>
            <p style={{ margin: '5px 0', color: '#d32f2f' }}><strong>Without Covers:</strong> {stats.skipped}</p>
            
            {Object.keys(categoryStats).length > 0 && (
              <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #ccc' }}>
                <p style={{ margin: '5px 0', fontWeight: 'bold', color: '#333' }}>By Category:</p>
                {Object.entries(categoryStats).map(([cat, catStat]) => (
                  <p key={cat} style={{ margin: '3px 0', fontSize: '14px', color: '#555', paddingLeft: '10px' }}>
                    <strong>{cat}:</strong> {catStat.withCovers}/{catStat.total} ({Math.round(catStat.withCovers/catStat.total*100)}%)
                    {catStat.wishlist > 0 && <span style={{ color: '#999', fontSize: '12px' }}> - {catStat.wishlist} wishlist</span>}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}
        {progress.total > 0 && (
          <div>
            <p style={{ color: '#333' }}><strong>Category:</strong> {progress.category}</p>
            <p style={{ color: '#333' }}><strong>Progress:</strong> {progress.current} / {progress.total}</p>
            <div style={{ width: '100%', height: '20px', background: '#ddd', borderRadius: '10px', overflow: 'hidden' }}>
              <div style={{ 
                width: `${(progress.current / progress.total) * 100}%`, 
                height: '100%', 
                background: '#4CAF50',
                transition: 'width 0.3s'
              }} />
            </div>
          </div>
        )}
      </div>

      <button
        onClick={downloadCovers}
        disabled={isDownloading}
        style={{
          padding: '12px 24px',
          fontSize: '16px',
          fontWeight: 'bold',
          background: isDownloading ? '#ccc' : '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: isDownloading ? 'not-allowed' : 'pointer',
          marginRight: '10px'
        }}
      >
        {isDownloading ? 'Processing...' : 'Scan Spreadsheets'}
      </button>

      {downloadedCovers.length > 0 && (
        <button
          onClick={downloadJSON}
          style={{
            padding: '12px 24px',
            fontSize: '16px',
            fontWeight: 'bold',
            background: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          Download Covers JSON ({downloadedCovers.length} items)
        </button>
      )}

      {downloadedCovers.length > 0 && (
        <div style={{ marginTop: '30px' }}>
          <h2 style={{ fontSize: '24px', marginBottom: '10px', color: '#000' }}>Preview (first 20):</h2>
          <div style={{ background: '#f9f9f9', padding: '15px', borderRadius: '6px', maxHeight: '400px', overflow: 'auto' }}>
            {downloadedCovers.slice(0, 20).map((cover, i) => (
              <div key={i} style={{ padding: '8px', borderBottom: '1px solid #eee' }}>
                <strong style={{ color: '#000' }}>{cover.title}</strong>
                <br />
                <span style={{ fontSize: '12px', color: '#666' }}>{cover.filename}</span>
              </div>
            ))}
            {downloadedCovers.length > 20 && (
              <p style={{ padding: '8px', fontStyle: 'italic', color: '#666' }}>
                ... and {downloadedCovers.length - 20} more
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
