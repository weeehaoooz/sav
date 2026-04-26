# ⚙️ SAV Backend

This is the Django backend API for the **SAV** Personal Financial Planning platform.

## 🚀 Getting Started

1. **Setup Virtual Environment**:
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   ```

2. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Run Migrations**:
   ```bash
   python manage.py migrate
   ```

4. **Start Development Server**:
   ```bash
   python manage.py runserver
   ```
   The API will be available at `http://127.0.0.1:8000/`.

## 🛠️ Tech Stack

- **Framework**: Django 4.2
- **API**: Django REST Framework
- **Auth**: SimpleJWT, dj-rest-auth
- **Database**: SQLite (Development)

## 📁 Project Structure

- `core/`: Main Django settings and configuration.
- `api/`: Main application logic, models, and serializers.
  - `models.py`: Financial entities (Assets, Incomes, Profiles).
  - `views.py`: API endpoints for simulations and data management.

## 📄 Reference

For the full project documentation and frontend setup, please refer to the [Root README](../README.md).
