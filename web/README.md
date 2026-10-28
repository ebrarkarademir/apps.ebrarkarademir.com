# Game Collection Web App

A modern, responsive web application featuring a collection of interactive games built with Vue.js and Tailwind CSS. The app is styled as a classic green CRT terminal: pitch-black screen, neon green monospace text and thin wireframe borders.

## 🎮 Featured Games

### 1. Number Guessing Game

- Guess a number between 1-100
- Real-time feedback (too high/too low)
- Attempt counter
- Responsive design with smooth animations
- Online multiplayer support (coming soon)

### 2. Wordle Game

- Infinite tries version of the classic word game
- Support for both English and Turkish languages
- Customizable word length (5-7 letters)
- Visual feedback for correct/present/absent letters
- Keyboard input support
- Animations for guesses and errors

### 3. Bottle Spin Game (Truth or Dare)

- Dynamic player count support
- Animated bottle spinning
- Color-coded player sections
- Truth and Dare options
- Extensive question/task database
- Supports multiple rounds

## 🚀 Features

- **Retro Terminal UI**

  - Black and phosphor-green palette with scanlines and glow
  - Sharp, unrounded wireframe components and text icons like [+] and [x]
  - Responsive design for all screen sizes
  - Design tokens and shared `term-*` classes in `src/style.css`
- **Accessibility**

  - Keyboard navigation support
  - Screen reader friendly
  - High contrast mode support
- **Performance**

  - Fast loading times
  - Optimized animations
  - Efficient state management

## 🛠 Technical Stack

- **Frontend Framework**: Vue.js 3 with Composition API
- **Styling**: Tailwind CSS
- **Build Tool**: Vite
- **Language**: JavaScript/TypeScript
- **State Management**: Vue Refs and Computed Properties
- **Animations**: CSS Transitions and Keyframes

## 📱 Responsive Design

The app is fully responsive and works seamlessly across:

- Desktop computers
- Tablets
- Mobile phones
- Different screen orientations

## 🔜 Upcoming Features

1. **Memory Match Game**

   - Classic card matching gameplay
   - Multiple difficulty levels
   - Score tracking
2. **Word Puzzle**

   - Vocabulary challenges
   - Multiple languages support
   - Progressive difficulty
3. **Math Quiz**

   - Quick calculations
   - Different operation types
   - Time challenges

## 🚀 Getting Started

1. Clone the repository:
   \`\`\`bash
   git clone [repository-url]
   \`\`\`
2. Install dependencies:
   \`\`\`bash
   cd [project-directory]
   npm install
   \`\`\`
3. Run development server:
   \`\`\`bash
   npm run dev
   \`\`\`
4. Build for production:
   \`\`\`bash
   npm run build
   \`\`\`

## 🔧 Configuration

The app can be configured through various environment variables:

- \`VITE_APP_TITLE\`: Application title
- \`VITE_API_URL\`: Backend API URL (for future use)
- \`VITE_FIREBASE_CONFIG\`: Firebase configuration (for multiplayer features)
- \`VITE_WORLD_URL\`: Where the server of Sunny Square, the 3D world, runs (\`wss://…/world-socket\`). A production build without it leaves the world off the menu; \`npm run dev\` starts that server by itself (see \`backend/README.md\`)

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the project
2. Create your feature branch (\`git checkout -b feature/AmazingFeature\`)
3. Commit your changes (\`git commit -m 'Add some AmazingFeature'\`)
4. Push to the branch (\`git push origin feature/AmazingFeature\`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Vue.js team for the amazing framework
- Tailwind CSS for the utility-first CSS framework
- The open-source community for inspiration and resources

## 📧 Contact

For any questions or suggestions, please open an issue in the repository.

---

Made with ❤️ using Vue.js and Tailwind CSS
