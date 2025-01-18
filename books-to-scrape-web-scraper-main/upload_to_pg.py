import requests
from bs4 import BeautifulSoup
import pandas as pd
import os
import psycopg2
import json
import threading

# Database connection parameters
db_params = {
    'dbname': 'books_scraped',
    'user': 'your_user',  # Replace with your actual username
    'password': 'pregres',  # Replace with your actual password
    'host': 'localhost',  # Adjust if you're connecting remotely
    'port': '5432'
}

# Base URL of the website
base_url = 'https://books.toscrape.com/catalogue/page-{}.html'
book_base_url = 'https://books.toscrape.com/catalogue/'

# Folder paths
images_folder = "C:\\Users\\HP\\Desktop\\BOOK FAIR  -TUNISIA\\books-to-scrape-web-scraper-main\\images"
csv_file = "C:\\Users\\HP\\Desktop\\BOOK FAIR  -TUNISIA\\books-to-scrape-web-scraper-main\\data_sheet\\books_data.csv"
json_file = "C:\\Users\\HP\\Desktop\\BOOK FAIR  -TUNISIA\\books-to-scrape-web-scraper-main\\data_sheet\\books_data.json"

# Create directories if they don't exist
os.makedirs('data_sheet', exist_ok=True)
os.makedirs('images', exist_ok=True)

# List to store book details
books = []

# Function to extract data from a single page
def extract_data_from_page(soup, page):
    for book in soup.find_all('article', class_='product_pod'):
        title = book.h3.a['title']
        price = book.find('p', class_='price_color').text.replace('£', '')  # Clean price
        availability = book.find('p', class_='instock availability').text.strip()
        rating_text = book.p['class'][1]
        rating = convert_rating_to_number(rating_text)
        link = book_base_url + book.h3.a['href']
        thumbnail_url = 'https://books.toscrape.com/' + book.find('img', class_='thumbnail')['src']
        thumbnail_file_name = save_thumbnail_image(thumbnail_url, title)

        # Adding data for the database
        book_data = {
            'Title': title,
            'Author': 'Unknown',               # Placeholder; adjust if available
            'Genre': 'Unknown',                # Placeholder; adjust if available
            'Publisher': 'Unknown',            # Placeholder; adjust if available
            'Year of Publication': 'Unknown',  # Placeholder; adjust if available
            'ISBN': 'Unknown',                 # Placeholder; adjust if available
            'Description': 'None',             # Placeholder; adjust if available
            'Language': 'English',             # Placeholder; adjust if available
            'Image': thumbnail_file_name,      # Local image file name
            'Website': 'https://books.toscrape.com'  # Website name
        }

        books.append(book_data)

# Function to convert rating text to a number
def convert_rating_to_number(rating_text):
    rating_dict = {
        'One': 1,
        'Two': 2,
        'Three': 3,
        'Four': 4,
        'Five': 5
    }
    return rating_dict.get(rating_text, 0)

# Function to save thumbnail image
def save_thumbnail_image(url, title):
    response = requests.get(url)
    sanitized_title = "".join([c if c.isalnum() else "_" for c in title])  # Sanitize title for valid filename
    image_path = os.path.join(images_folder, f"{sanitized_title}.jpg")
    with open(image_path, 'wb') as file:
        file.write(response.content)
    return image_path

# Function to connect to the database
def connect_db():
    conn = psycopg2.connect(
        dbname=db_params['dbname'],
        user=db_params['user'],
        password=db_params['password'],
        host=db_params['host'],
        port=db_params['port']
    )
    conn.set_client_encoding('UTF8')  # Ensuring UTF-8 encoding is set
    return conn

# Function to check if the book already exists in the database
def check_if_exists_in_db(title):
    conn = connect_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM books WHERE title = %s;", (title,))
    result = cursor.fetchone()
    conn.close()
    return result is not None

# Function to insert book data into the database
def insert_into_db(book_data):
    try:
        # Check if book already exists
        if not check_if_exists_in_db(book_data['Title']):
            conn = connect_db()
            cursor = conn.cursor()

            # Create table if it doesn't exist
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS books (
                id SERIAL PRIMARY KEY,
                title TEXT,
                author TEXT,
                genre TEXT,
                publisher TEXT,
                year_of_publication TEXT,
                isbn TEXT,
                description TEXT,
                language TEXT,
                image TEXT,
                website TEXT
            );
            """)

            # Insert the book data
            cursor.execute("""
            INSERT INTO books (title, author, genre, publisher, year_of_publication, isbn, description, language, image, website)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s);
            """, (
                book_data['Title'], book_data['Author'], book_data['Genre'], book_data['Publisher'],
                book_data['Year of Publication'], book_data['ISBN'], book_data['Description'], 
                book_data['Language'], book_data['Image'], book_data['Website']
            ))

            # Commit changes and close connection
            conn.commit()
            cursor.close()
            conn.close()
            print(f"Successfully inserted '{book_data['Title']}' into the database")  # Success message
        else:
            print(f"'{book_data['Title']}' already exists in the database.")
    except Exception as e:
        print(f"Error inserting '{book_data['Title']}' into the database: {e}")
        save_failed_row_to_csv(book_data)

# Function to save failed rows to CSV
def save_failed_row_to_csv(book_data):
    df = pd.DataFrame([book_data])
    df.to_csv('failed_inserts.csv', mode='a', header=False, index=False)
    print(f"Saved '{book_data['Title']}' to failed_inserts.csv")

# Function to save books data to a CSV file
def save_to_csv(books):
    df = pd.DataFrame(books)
    df.to_csv(csv_file, index=False)
    print(f"Data saved to {csv_file}")

# Function to save books data to a JSON file
def save_to_json(books):
    with open(json_file, 'w', encoding='utf-8') as f:
        json.dump(books, f, ensure_ascii=False, indent=4)
    print(f"Data saved to {json_file}")

# Function to load data from CSV or JSON
def load_data():
    if os.path.exists(csv_file):
        print(f"Loading data from {csv_file}")
        return pd.read_csv(csv_file).to_dict(orient='records')
    elif os.path.exists(json_file):
        print(f"Loading data from {json_file}")
        with open(json_file, 'r', encoding='utf-8') as f:
            return json.load(f)
    else:
        return []

# Function to save to both CSV and JSON in parallel
def save_data_in_parallel(books):
    csv_thread = threading.Thread(target=save_to_csv, args=(books,))
    json_thread = threading.Thread(target=save_to_json, args=(books,))
    csv_thread.start()
    json_thread.start()

    csv_thread.join()
    json_thread.join()

# Load data if available
loaded_books = load_data()
books.extend(loaded_books)

# Loop through the first 10 pages (if not loading from files)
if not loaded_books:
    for page in range(1, 11):  # Scraping the first 10 pages
        url = base_url.format(page)
        response = requests.get(url)
        soup = BeautifulSoup(response.content, 'html.parser')
        extract_data_from_page(soup, page)
        print(f"Extracted data from page {page}")

# Save the data to both CSV and JSON in parallel
save_data_in_parallel(books)

# Insert the data into the PostgreSQL database
for book in books:
    insert_into_db(book)

print("All data inserted into the database and saved to CSV and JSON.")
