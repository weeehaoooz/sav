# 🏦 SAV - Personal Financial Planning Platform

[![Angular](https://img.shields.io/badge/Frontend-Angular%2021-red.svg)](https://angular.dev/)
[![Django](https://img.shields.io/badge/Backend-Django%204.2-green.svg)](https://www.djangoproject.com/)
[![Made with Love](https://img.shields.io/badge/Made%20with-Love-orange.svg)](#)

SAV is an open-source personal financial planning platform designed to empower individuals with powerful simulation and tracking tools. Built with a focus on precision and modern aesthetics, SAV helps you navigate complex financial landscapes—starting with a deep focus on the Singapore financial ecosystem (CPF, IRAS, etc.).

## ✨ Features

- **📊 Comprehensive Tax Simulations**: Detailed Singapore Personal Income Tax simulations including IRAS tax brackets, earned income relief, and more.
- **🛡️ CPF Integration**: Automated calculation of CPF contributions (OW/AW) and projections for Ordinary, Special, and Medisave accounts.
- **🚀 Retirement Planning**: Long-term projections to help you visualize your financial future and independence.
- **👥 Multi-Profile Management**: Compare different financial scenarios or plan for your entire household.
- **🌓 Modern UI/UX**: Premium, responsive interface with full support for Light and Dark modes.
- **🛠️ Extensible Tooling**: Built with a modular architecture to easily add new financial tools and localizations.

## 🏗️ Architecture

The project is split into two main components:

- **Frontend**: A modern Angular application leveraging Signals, standalone components, and AG Grid for high-performance data visualization.
- **Backend**: A robust Django REST Framework API handling complex financial logic, authentication, and data persistence.

## 🚀 Getting Started

### Prerequisites

- **Python 3.10+**
- **Node.js 18+**
- **npm** or **yarn**

### Quick Start (Full Stack)

The easiest way to get started is using the provided start script which launches both the backend and frontend concurrently:

```bash
./start.sh
```

### Manual Setup

#### Backend
1. Navigate to the backend directory: `cd sav-backend`
2. Create and activate a virtual environment:
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   ```
3. Install dependencies: `pip install -r requirements.txt`
4. Run migrations: `python manage.py migrate`
5. Start the server: `python manage.py runserver`

#### Frontend
1. Navigate to the frontend directory: `cd sav-frontend`
2. Install dependencies: `npm install`
3. Start the development server: `npm start`
4. Access the app at `http://localhost:4200`

## 🛠️ Tech Stack

- **Frontend**: [Angular](https://angular.dev/), [SCSS](https://sass-lang.com/), [AG Grid](https://www.ag-grid.com/)
- **Backend**: [Django](https://www.djangoproject.com/), [Django REST Framework](https://www.django-rest-framework.org/)
- **Database**: SQLite (Development) / PostgreSQL (Production)
- **Auth**: JWT (JSON Web Tokens)

## 🤝 Contributing

We welcome contributions! Whether it's a bug report, a new feature request, or a pull request, your help is appreciated.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

*Disclaimer: This tool is for educational and planning purposes only. Always consult with a certified financial advisor for professional advice.*
