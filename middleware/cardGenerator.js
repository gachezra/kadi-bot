function generateCardSVG(rank, suit) {
  const suitColors = {
    '♥': '#FF5555',
    '♦': '#FF5555',
    '♠': '#2D3436',
    '♣': '#2D3436'
  };

  const color = suitColors[suit] || '#2D3436';
  
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="400" height="700" viewBox="0 0 200 350">
  <defs>
    <!-- Gradient background -->
    <linearGradient id="cardGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#ffffff;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#f7f7f7;stop-opacity:1" />
    </linearGradient>
    
    <!-- Animation for background patterns -->
    <pattern id="dotPattern" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
      <circle cx="2" cy="2" r="1" fill="${color}" opacity="0.1">
        <animate attributeName="opacity"
          values="0.1;0.3;0.1"
          dur="3s"
          repeatCount="indefinite"/>
      </circle>
    </pattern>
    
    <!-- Card shine effect -->
    <linearGradient id="shineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:rgba(255,255,255,0)">
        <animate attributeName="offset" values="0;1;0" dur="5s" repeatCount="indefinite"/>
      </stop>
      <stop offset="20%" style="stop-color:rgba(255,255,255,0.5)">
        <animate attributeName="offset" values="0.2;1.2;0.2" dur="5s" repeatCount="indefinite"/>
      </stop>
      <stop offset="40%" style="stop-color:rgba(255,255,255,0)">
        <animate attributeName="offset" values="0.4;1.4;0.4" dur="5s" repeatCount="indefinite"/>
      </stop>
    </linearGradient>
  </defs>

  <!-- Card background -->
  <rect x="10" y="10" width="180" height="330" rx="15" ry="15" 
    fill="url(#cardGradient)" 
    stroke="${color}" 
    stroke-width="2"/>
  
  <!-- Decorative background pattern -->
  <rect x="10" y="10" width="180" height="330" rx="15" ry="15" 
    fill="url(#dotPattern)" 
    opacity="0.3"/>
  
  <!-- Shine effect -->
  <rect x="10" y="10" width="180" height="330" rx="15" ry="15" 
    fill="url(#shineGradient)" 
    opacity="0.3"/>
    
  <!-- Card borders design -->
  <rect x="20" y="20" width="160" height="310" rx="10" ry="10" 
    fill="none" 
    stroke="${color}" 
    stroke-width="1" 
    stroke-dasharray="2,2"
    opacity="0.3"/>

  <!-- Top left rank and suit -->
  <text x="35" y="60" font-family="Arial, sans-serif" font-size="40" fill="${color}" font-weight="bold">${rank}</text>
  <text x="35" y="100" font-family="Arial, sans-serif" font-size="40">${suit}</text>

  <!-- Bottom right rank and suit (inverted) -->
  <g transform="translate(165,290) rotate(180)">
    <text x="0" y="0" font-family="Arial, sans-serif" font-size="40" fill="${color}" font-weight="bold">${rank}</text>
    <text x="0" y="40" font-family="Arial, sans-serif" font-size="40">${suit}</text>
  </g>

  <!-- Center suit (larger) -->
  <text x="115" y="190" font-family="Arial, sans-serif" font-size="100" text-anchor="middle" fill="${color}" opacity="0.8">
    ${suit}
    <animate attributeName="transform" 
      attributeType="XML" 
      type="scale" 
      values="1;1.1;1"
      dur="2s" 
      repeatCount="indefinite"
      additive="sum"/>
  </text>
</svg>`;
}

module.exports = generateCardSVG