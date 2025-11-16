import React from 'react';
import { Box } from '@mui/material';

interface SearchHighlightProps {
  text: string;
  query: string;
}

const SearchHighlight: React.FC<SearchHighlightProps> = ({ text, query }) => {
  if (!query.trim()) {
    return <>{text}</>;
  }

  // Escape special regex characters in the query
  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // Create regex to match query (case-insensitive)
  const regex = new RegExp(`(${escapedQuery})`, 'gi');

  // Split text by matches
  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, index) => {
        // Check if this part matches the query
        const isMatch = regex.test(part);
        regex.lastIndex = 0; // Reset regex for next test

        if (isMatch) {
          return (
            <Box
              key={index}
              component="span"
              sx={{
                backgroundColor: 'warning.light',
                fontWeight: 'bold',
                padding: '2px 4px',
                borderRadius: 0.5,
              }}
            >
              {part}
            </Box>
          );
        }

        return <React.Fragment key={index}>{part}</React.Fragment>;
      })}
    </>
  );
};

export default SearchHighlight;
