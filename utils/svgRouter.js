const express = require('express');
const router = express.Router();
const path = require('path');

// Route to serve SVG files
router.get('/svg/:fileName', function(req, res, next) {
  const fileName = req.params.fileName;
  const filePath = path.join(__dirname, 'cards', fileName);

  res.setHeader('Content-Type', 'image/svg+xml');
  res.sendFile(filePath, (err) => {
    if (err) {
      console.error('Error sending SVG file:', err);
      res.status(404).send('SVG file not found');
    }
  });
});

module.exports = router;