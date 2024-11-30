const generateCardSVG = require('../middleware/cardGenerator');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');
const sharp = require('sharp');

const suits = ['♥', '♦', '♣', '♠'];
const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

// Function to save URLs to a log file with emoji suits
async function saveUrlLog(rank, suit, imageUrl) {
  const logPath = path.join(__dirname, '..', 'card-urls.txt');
  const logEntry = `${rank}${suit} = (${imageUrl})\n`;
  
  try {
    await fs.promises.appendFile(logPath, logEntry);
    console.log(`Logged URL for ${rank}${suit}`);
  } catch (error) {
    console.error('Error saving URL log:', error);
  }
}

async function uploadToServer(svgBuffer, filename) {
  try {
    const jpegBuffer = await sharp(svgBuffer)
      .resize(600, 1050)
      .jpeg({ quality: 90 })
      .toBuffer();

    const formData = new FormData();
    formData.append('file', jpegBuffer, {
      filename: filename.replace('.svg', '.jpg'),
      contentType: 'image/jpeg',
    });
    formData.append('upload_preset', 'events');

    const response = await axios.post(
      'https://api.cloudinary.com/v1_1/dykwdjdaf/image/upload',
      formData,
      {
        headers: formData.getHeaders(),
      }
    );

    const imageUrl = response.data.secure_url;
    if (imageUrl) {
      console.log(`Uploaded ${filename}: ${imageUrl}`);
      return imageUrl;
    } else {
      console.error('Upload failed. No URL returned.');
    }
  } catch (error) {
    console.error('Error uploading:', error);
  }
}

async function generateAndUploadCards() {
  try {
    const cardsDir = path.join(__dirname, '..', 'cards');
    await fs.promises.mkdir(cardsDir, { recursive: true });

    // Clear the previous log file if it exists
    const logPath = path.join(__dirname, '..', 'card-urls.txt');
    await fs.promises.writeFile(logPath, '');

    for (const suit of suits) {
      for (const rank of ranks) {
        const cardSvg = generateCardSVG(rank, suit);
        const filename = `${rank}${suit}.svg`;
        const filepath = path.join(cardsDir, filename);

        await fs.promises.writeFile(filepath, cardSvg);
        console.log(`Saved ${filename}`);

        const imageUrl = await uploadToServer(Buffer.from(cardSvg), filename);
        if (imageUrl) {
          await saveUrlLog(rank, suit, imageUrl);
        }
      }
    }
    console.log('All 52 cards have been generated and uploaded!');
  } catch (error) {
    console.error('Error generating or uploading cards:', error);
  }
}

generateAndUploadCards();