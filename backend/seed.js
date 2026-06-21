require('dotenv').config();
const mongoose = require('mongoose');
const GalleryImage = require('./models/GalleryImage');
const Product = require('./models/Product');

// Hardcoded seed data mirrored from the frontend source files.
// src fields use /media/... paths — replace these with real files in Motown_Media.
const gallerySeeds = [
  { src: '/media/gallery/image1.jpeg',  title: 'Morning at the Boardwalk',   description: 'Students enjoying a morning stroll along the scenic boardwalk.',       category: 'Boardwalk',    aspectRatio: 0.75, date: 'March 12, 2025',    publisher: 'Ms. Adjoa Mensah',   location: 'Cape Coast, Ghana' },
  { src: '/media/gallery/image2.jpeg',  title: 'Beach Volleyball Game',       description: 'Students playing volleyball on the sandy beach near the boardwalk.',   category: 'Boardwalk',    aspectRatio: 1.4,  date: 'April 1, 2025',     publisher: 'Mr. Nii Kwaku',      location: 'Elmina, Ghana' },
  { src: '/media/gallery/image3.jpeg',  title: 'Sunset View from Pier',       description: 'Beautiful sunset over the water as seen from the fishing pier.',       category: 'Fishing Pier', aspectRatio: 1,    date: 'February 28, 2025', publisher: 'Ms. Lydia Osei',     location: 'Keta, Ghana' },
  { src: '/media/gallery/image4.jpeg',  title: 'Fishing Pier Afternoon',      description: 'Students exploring and learning about local marine life at the pier.', category: 'Fishing Pier', aspectRatio: 0.7,  date: 'May 8, 2025',       publisher: 'Dr. Kwesi Aboagye',  location: 'Saltpond, Ghana' },
  { src: '/media/gallery/image5.jpeg',  title: 'Boardwalk Snack Time',        description: 'Students enjoying refreshments and socializing along the boardwalk.',  category: 'Boardwalk',    aspectRatio: 1.5,  date: 'January 20, 2025',  publisher: 'Ms. Akosua Yeboah',  location: 'Accra, Ghana' },
  { src: '/media/gallery/image6.jpeg',  title: 'Scenic Ocean View',           description: 'Students taking in the peaceful ocean scenery from the boardwalk.',    category: 'Boardwalk',    aspectRatio: 1,    date: 'June 3, 2025',      publisher: 'Mr. Daniel Opoku',   location: 'Ada Foah, Ghana' },
  { src: '/media/gallery/image7.jpeg',  title: 'Kite Flying Adventure',       description: 'Students flying kites on the open space near the boardwalk.',          category: 'Boardwalk',    aspectRatio: 0.8,  date: 'July 14, 2025',     publisher: 'Ms. Emefa D.',       location: 'Takoradi, Ghana' },
  { src: '/media/gallery/image8.jpeg',  title: 'Evening Pier Walk',           description: 'Students taking an educational evening walk along the fishing pier.',  category: 'Fishing Pier', aspectRatio: 1.3,  date: 'August 2, 2025',    publisher: 'Dr. Felicia Ansah',  location: 'Winneba, Ghana' },
  { src: '/media/gallery/image9.jpeg',  title: 'Boardwalk Path',              description: 'A peaceful pathway along the boardwalk with scenic ocean views.',      category: 'Boardwalk',    aspectRatio: 1,    date: 'September 9, 2025', publisher: 'Mr. Isaac Dankwa',   location: 'Prampram, Ghana' },
  { src: '/media/gallery/image10.jpeg', title: 'Waves and Horizon',           description: 'Students observing the ocean waves and horizon from the pier.',        category: 'Fishing Pier', aspectRatio: 0.75, date: 'October 1, 2025',   publisher: 'Ms. Patricia A.',    location: 'Anloga, Ghana' },
  { src: '/media/gallery/image11.jpeg', title: 'Scenic Pier View',            description: 'Wide view of the fishing pier stretching into the water.',             category: 'Fishing Pier', aspectRatio: 1.6,  date: 'November 11, 2024', publisher: 'Mr. Daniel Owusu',   location: 'Cape Coast, Ghana' },
  { src: '/media/gallery/image12.jpeg', title: 'Boardwalk Recreation',        description: 'Students engaging in recreational activities on the boardwalk.',       category: 'Boardwalk',    aspectRatio: 1,    date: 'December 5, 2024',  publisher: 'Ms. Comfort Y.',     location: 'Cape Coast, Ghana' },
  { src: '/media/gallery/image13.jpeg', title: 'Peaceful Pier Moments',       description: 'Quiet moments spent observing nature from the fishing pier.',          category: 'Fishing Pier', aspectRatio: 0.65, date: 'January 2, 2025',   publisher: 'Mr. Kwame T.',       location: 'Elmina, Ghana' },
  { src: '/media/gallery/image14.jpeg', title: 'Boardwalk Activities',        description: 'Various school activities and social gatherings on the boardwalk.',    category: 'Boardwalk',    aspectRatio: 1.45, date: 'February 14, 2025', publisher: 'Ms. Akua Frimpong',  location: 'Accra, Ghana' },
  { src: '/media/gallery/image15.jpeg', title: 'Marine Education',            description: 'Students learning about marine ecosystems at the fishing pier.',       category: 'Fishing Pier', aspectRatio: 1,    date: 'March 3, 2025',     publisher: 'Dr. Nana Yeboah',    location: 'Anomabo, Ghana' },
];

const productSeeds = [
  { name: 'School T-Shirt',     category: 'Apparel',     price: 55,  image: '/media/products/tshirt.jpeg',     description: 'Comfortable 100% cotton tee with embroidered Achimota crest.',       stock: 50 },
  { name: 'School Hoodie',      category: 'Apparel',     price: 120, image: '/media/products/hoodie.jpeg',     description: 'Premium fleece hoodie — perfect for cool Accra evenings.',           stock: 30 },
  { name: 'School Sweatshirt',  category: 'Apparel',     price: 95,  image: '/media/products/sweatshirt.jpeg', description: 'Cozy crew-neck sweatshirt with school motto.',                       stock: 25 },
  { name: 'School Cap',         category: 'Apparel',     price: 40,  image: '/media/products/cap.jpeg',        description: 'Adjustable six-panel cap with embroidered logo.',                    stock: 60 },
  { name: 'School Polo Shirt',  category: 'Apparel',     price: 70,  image: '/media/products/polo.jpeg',       description: 'Classic pique polo with embroidered school badge.',                  stock: 40 },
  { name: 'School Backpack',    category: 'Accessories', price: 150, image: '/media/products/backpack.jpeg',   description: 'Durable 30-litre backpack with padded laptop sleeve.',               stock: 20 },
  { name: 'School Keychain',    category: 'Accessories', price: 15,  image: '/media/products/keychain.jpeg',   description: 'Solid brass keychain with Achimota school emblem.',                  stock: 100 },
  { name: 'School Badge',       category: 'Accessories', price: 12,  image: '/media/products/badge.jpeg',      description: 'Enamel lapel badge bearing the school crest.',                      stock: 80 },
  { name: 'School Wristband',   category: 'Accessories', price: 8,   image: '/media/products/wristband.jpeg',  description: 'Silicone wristband printed with the school motto.',                  stock: 120 },
  { name: 'School Umbrella',    category: 'Accessories', price: 55,  image: '/media/products/umbrella.jpeg',   description: 'Compact auto-open umbrella in school colours.',                     stock: 35 },
  { name: 'School Notebook',    category: 'Stationery',  price: 20,  image: '/media/products/notebook.jpeg',   description: 'A5 hardcover notebook with school branding — 200 pages.',           stock: 70 },
  { name: 'School Pen Set',     category: 'Stationery',  price: 25,  image: '/media/products/penset.jpeg',     description: 'Set of 5 ballpoint pens in school colours.',                        stock: 90 },
  { name: 'School Sticker Pack',category: 'Stationery',  price: 15,  image: '/media/products/stickers.jpeg',   description: 'Pack of 12 premium vinyl stickers with school art.',                stock: 150 },
  { name: 'School Calendar',    category: 'Stationery',  price: 18,  image: '/media/products/calendar.jpeg',   description: 'A3 wall calendar with academic events and school photos.',           stock: 45 },
  { name: 'School Mouse Pad',   category: 'Stationery',  price: 22,  image: '/media/products/mousepad.jpeg',   description: 'Extra-large desk mat with the school crest.',                       stock: 55 },
  { name: 'School Mug',         category: 'Drinkware',   price: 35,  image: '/media/products/mug.jpeg',        description: 'Ceramic 350 ml mug with the Achimota school crest.',                stock: 60 },
  { name: 'School Water Bottle',category: 'Drinkware',   price: 48,  image: '/media/products/bottle.jpeg',     description: 'Double-walled 500 ml stainless steel bottle.',                      stock: 40 },
  { name: 'School Lunch Box',   category: 'House Items', price: 40,  image: '/media/products/lunchbox.jpeg',   description: 'Insulated 3-compartment lunch box for boarding students.',           stock: 30 },
  { name: 'School Towel',       category: 'House Items', price: 30,  image: '/media/products/towel.jpeg',      description: '100% cotton bath towel in school colours.',                         stock: 50 },
  { name: 'School Phone Case',  category: 'House Items', price: 35,  image: '/media/products/phonecase.jpeg',  description: 'Shock-proof case with Achimota crest print.',                       stock: 65 },
];

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  await GalleryImage.deleteMany({});
  await Product.deleteMany({});

  await GalleryImage.insertMany(gallerySeeds);
  await Product.insertMany(productSeeds);

  console.log(`Seeded ${gallerySeeds.length} gallery images`);
  console.log(`Seeded ${productSeeds.length} products`);

  await mongoose.disconnect();
  console.log('Done');
}

seed().catch(err => { console.error(err); process.exit(1); });
