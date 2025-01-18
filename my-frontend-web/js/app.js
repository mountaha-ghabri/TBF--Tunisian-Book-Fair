// Base URL of the API
export const API_URL = "http://localhost:3000"; // Update with your API URL

// Set the default language if not set
const DEFAULT_LANG = 'en'; // Set the default language (English)

// Check if there's a saved language in localStorage, otherwise use default
const savedLang = localStorage.getItem("language") || DEFAULT_LANG;
document.documentElement.lang = savedLang;  // Set the lang attribute for HTML

// Fetch and display Braille books
export function fetchBooks() {
    fetch(`${API_URL}/braille-books`)
        .then(response => response.json())
        .then(data => {
            const bookList = document.getElementById('bookList');
            bookList.innerHTML = '';
            data.forEach(book => {
                const li = document.createElement('li');
                li.innerHTML = `<a href="${book.downloadLink}" target="_blank">${book.title}</a>`;
                bookList.appendChild(li);
            });
        })
        .catch(error => console.error('Error fetching Braille books:', error));
}

// Fetch and display Audiobooks
export function fetchAudiobooks() {
    fetch(`${API_URL}/audiobooks`)
        .then(response => response.json())
        .then(data => {
            const audioList = document.getElementById('audioList');
            audioList.innerHTML = '';
            data.forEach(audio => {
                const li = document.createElement('li');
                li.innerHTML = `<a href="${audio.downloadLink}" target="_blank">${audio.title}</a>`;
                audioList.appendChild(li);
            });
        })
        .catch(error => console.error('Error fetching Audiobooks:', error));
}

// Handle Login
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });

    const data = await response.json();
    const loginMessage = document.getElementById('loginMessage');
    if (response.ok) {
        loginMessage.textContent = getTranslation("login_success");
        localStorage.setItem('token', data.token); // Save token for future use
    } else {
        loginMessage.textContent = data.message || getTranslation("login_failed");
        loginMessage.style.color = 'red';
    }
});

// Change language function
function changeLanguage(lang) {
    localStorage.setItem('language', lang);
    document.documentElement.lang = lang;
    loadTranslations(lang);
}

// Load translations for the selected language
function loadTranslations(lang) {
    const translations = getTranslations(lang);

    // Apply translations to text elements on the page
    document.getElementById("loginFormTitle").textContent = translations.loginFormTitle;
    document.getElementById("emailLabel").textContent = translations.emailLabel;
    document.getElementById("passwordLabel").textContent = translations.passwordLabel;
    document.getElementById("loginButton").textContent = translations.loginButton;
    document.getElementById("registerLink").textContent = translations.registerLink;
    document.getElementById("forgotPasswordLink").textContent = translations.forgotPasswordLink;
}

// Get translations for the selected language (you can load this from a file or a JSON object)
function getTranslations(lang) {
    const translations = {
        en: {
            loginFormTitle: "Login to Your Account",
            emailLabel: "Email",
            passwordLabel: "Password",
            loginButton: "Login",
            registerLink: "Don't have an account? Register",
            forgotPasswordLink: "Forgot password?",
            login_success: "Login successful!",
            login_failed: "Login failed. Please check your credentials."
        },
        fr: {
            loginFormTitle: "Se connecter à votre compte",
            emailLabel: "Email",
            passwordLabel: "Mot de passe",
            loginButton: "Se connecter",
            registerLink: "Vous n'avez pas de compte? S'inscrire",
            forgotPasswordLink: "Mot de passe oublié?",
            login_success: "Connexion réussie!",
            login_failed: "Échec de la connexion. Vérifiez vos identifiants."
        },
        ar: {
            loginFormTitle: "تسجيل الدخول إلى حسابك",
            emailLabel: "البريد الإلكتروني",
            passwordLabel: "كلمة السر",
            loginButton: "تسجيل الدخول",
            registerLink: "ليس لديك حساب؟ سجل الآن",
            forgotPasswordLink: "هل نسيت كلمة السر؟",
            login_success: "تم تسجيل الدخول بنجاح!",
            login_failed: "فشل تسجيل الدخول. تحقق من بيانات الاعتماد الخاصة بك."
        }
    };

    return translations[lang];
}

// Event listener for language change
document.getElementById('language-selector').addEventListener('change', (e) => {
    changeLanguage(e.target.value);
});

// Initialize the page with the current language
document.addEventListener("DOMContentLoaded", () => {
    loadTranslations(savedLang); // Load the language-specific content on page load
});