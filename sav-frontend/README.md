# 🎨 SAV Frontend

This is the Angular frontend for the **SAV** Personal Financial Planning platform.

## 🚀 Getting Started

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Start Development Server**:
   ```bash
   npm start
   ```
   Navigate to `http://localhost:4200/`.

## 🛠️ Tech Stack

- **Framework**: Angular 21 (Signals, Standalone Components)
- **Styling**: SCSS (Theme-aware, Dark/Light modes)
- **Data Grid**: AG Grid (Enterprise-grade tables)
- **Testing**: Vitest

## 🏗️ Architecture

- `src/app/core`: Singleton services, guards, and interceptors.
- `src/app/shared`: Reusable UI components, pipes, and directives.
- `src/app/features`: Domain-specific modules (Simulations, Assets, etc.).
- `src/app/theme`: Design system tokens and global styling.

## 🧪 Testing

```bash
npm test
```

## 📄 Reference

For the full project documentation and backend setup, please refer to the [Root README](../README.md).
