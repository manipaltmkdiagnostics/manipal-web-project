const fs = require('fs');
const src = 'C:\\Users\\lokad\\.gemini\\antigravity-ide\\brain\\47024baa-decc-4c2d-80bb-0e3bac77a168\\home_sample_collection_1780496935696.png';
const dest = 'd:\\Manipal web project\\public\\images\\home-sample-collection.png';
fs.copyFileSync(src, dest);
console.log('Image copied successfully');
