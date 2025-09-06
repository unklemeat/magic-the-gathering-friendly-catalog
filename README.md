# MTG Friendly Catalog

A modern, user-friendly web application for managing your Magic: The Gathering card collection with real-time pricing data from Scryfall API.

## Features

### 🔍 **Card Search & Management**
- **Single Card Search**: Search for cards by name with fuzzy matching
- **Voice Search**: Voice recognition support for hands-free card searching
- **Real-time Pricing**: Get current EUR and USD prices from Scryfall
- **Multiple Print Selection**: Choose between different printings of the same card
- **Smart Card Detection**: Automatic handling of double-faced cards and variants

### 📊 **Collection Management**
- **Personal Collection**: Build and manage your card collection
- **Advanced Filtering**: Filter by color, multicolor, colorless, and lands
- **Sortable Tables**: Sort by name, set, price, or color
- **Card Details**: View high-resolution images and oracle text
- **Bulk Operations**: CSV import for large collections

### 🎯 **Deck Builder**
- **Multiple Decks**: Create and manage multiple deck lists
- **Drag & Drop Interface**: Easy card management between collection and decks
- **Real-time Sync**: Changes are automatically saved
- **Search & Filter**: Quickly find cards in your collection

### 🌐 **Multi-language Support**
- **Italian & English**: Full interface translation
- **Localized Card Names**: Display Italian card names when available
- **Regional Pricing**: EUR and USD price display

### 📱 **Modern Interface**
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Dark Theme**: Card detail modals with dark theme
- **Smooth Animations**: Modern transitions and hover effects
- **Progressive Loading**: Efficient data loading with progress indicators

## Technical Stack

- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Styling**: Tailwind CSS
- **Database**: Firebase Firestore
- **Authentication**: Firebase Anonymous Auth
- **API**: Scryfall Magic: The Gathering API
- **Storage**: Real-time cloud synchronization

## Setup Instructions

### Prerequisites
- A modern web browser with JavaScript enabled
- Firebase project (for data persistence)
- Internet connection (for Scryfall API access)

### Configuration

1. **Firebase Setup**:
   ```javascript
   // Configure your Firebase project
   const firebaseConfig = {
     apiKey: "your-api-key",
     authDomain: "your-project.firebaseapp.com",
     projectId: "your-project-id",
     // ... other config
   };
   ```

2. **Database Structure**:
   The application uses the following Firestore structure:
   ```
   artifacts/
     └── {appId}/
         └── users/
             └── {userId}/
                 ├── collection/
                 │   └── {cardId} (card data)
                 └── decks/
                     └── {deckId}
                         ├── name
                         └── cards[]
   ```

### Local Development

1. Clone or download the application files
2. Configure Firebase credentials in the JavaScript
3. Open `mgt-catalog.html` in a modern web browser
4. The application will automatically connect to Scryfall API

## Usage Guide

### Adding Cards

1. **Single Card Search**:
   - Enter card name in the search field
   - Use voice search button for speech recognition
   - Select from multiple printings if available
   - Card automatically added to collection

2. **CSV Import**:
   - Prepare CSV with format: `CardName;SetCode`
   - Upload via the CSV tab
   - Process automatically adds all found cards

3. **Set Exploration**:
   - Browse entire Magic sets
   - Click cards to view details and add to collection

### Managing Collection

- **Filter by Color**: Use color checkboxes to filter your collection
- **Sort Data**: Click column headers to sort by different criteria
- **Remove Cards**: Use delete button to remove cards from collection
- **Export Data**: Save your collection as JSON for backup

### Building Decks

1. Create a new deck from the Decks tab
2. Enter deck editor by clicking on a deck
3. Add cards from your collection by clicking on them
4. Remove cards from deck using the remove button
5. Deck changes are automatically saved

## API Rate Limiting

The application respects Scryfall's API rate limits:
- Maximum 10 requests per second
- Built-in request queuing system
- Automatic retry logic for failed requests

## Browser Compatibility

- **Recommended**: Chrome, Firefox, Safari, Edge (latest versions)
- **Voice Search**: Webkit-based browsers (Chrome, Safari, Edge)
- **Required Features**: ES6+ support, Fetch API, CSS Grid

## Data Privacy

- **Anonymous Authentication**: No personal data required
- **Local Storage**: All data stored in your Firebase project
- **No Tracking**: No analytics or user tracking implemented
- **Offline Capability**: Basic functionality works without internet (cached data)

## Troubleshooting

### Common Issues

1. **API Connection Errors**:
   - Check internet connection
   - Refresh the page to retry Scryfall connection
   - Check browser console for detailed error messages

2. **Cards Not Found**:
   - Try different spellings or use English names
   - Check if the card exists on Scryfall
   - Use fuzzy search by entering partial names

3. **Voice Search Not Working**:
   - Ensure microphone permissions are granted
   - Use a supported browser (Chrome, Safari, Edge)
   - Check that microphone is working in other applications

4. **Data Not Syncing**:
   - Verify Firebase configuration
   - Check internet connection
   - Ensure proper authentication

## Contributing

This is a single-file application designed for easy customization:

- **Translations**: Edit the `translations` object for new languages
- **Styling**: Modify Tailwind classes or add custom CSS
- **Features**: Add new functionality in the modular JavaScript structure
- **API Integration**: Extend with other Magic: The Gathering APIs

## License

This project is provided as-is for educational and personal use. Scryfall API usage is subject to their terms of service.

## Acknowledgments

- **Scryfall**: For providing the excellent Magic: The Gathering API
- **Wizards of the Coast**: For Magic: The Gathering
- **Tailwind CSS**: For the utility-first CSS framework
- **Firebase**: For real-time database and authentication services

---

*Built with ❤️ for the Magic: The Gathering community*
