import psycopg2   # type: ignore
import csv  
import os  

# Database connection details  
DB_NAME = "books_db"  
DB_USER = "postgres"  
DB_PASSWORD = "pregres"  
DB_HOST = "localhost"  
DB_PORT = "5432"  

# Path to the CSV file  
base_path = os.path.dirname(os.path.abspath(__file__))  # Directory of the script  
csv_file = os.path.join(base_path, 'books_data.csv')  # Corrected path to the CSV file  

# Verify the CSV file exists  
if not os.path.exists(csv_file):  
    raise FileNotFoundError(f"The file {csv_file} does not exist. Check the path!")  

# Connect to PostgreSQL  
try:  
    conn = psycopg2.connect(  
        dbname=DB_NAME,  
        user=DB_USER,  
        password=DB_PASSWORD,  
        host=DB_HOST,  
        port=DB_PORT  
    )  
    cursor = conn.cursor()  
    print("Connected to the database successfully!")  

    # Create table if not exists  
    cursor.execute("""  
    CREATE TABLE IF NOT EXISTS books (  
        id SERIAL PRIMARY KEY,  
        title VARCHAR(255) NOT NULL,  
        author VARCHAR(255),  
        genre VARCHAR(100),  
        publisher VARCHAR(100),  
        year_of_publication INT,  
        isbn VARCHAR(13),  
        description TEXT,  
        language VARCHAR(50),  
        image VARCHAR(255)  -- Added this line  
    );  
    """)  
    conn.commit()  
    print("Table is ready!")  

    # Read and insert data from CSV  
    with open(csv_file, 'r', encoding='utf-8') as file:  
        reader = csv.reader(file)  
        header = next(reader)  # Skip header row if it exists  
        for row in reader:  
            print(f"Processing row: {row}")  # Log the current row for debugging  
            try:  
                if len(row) != 9:  # Check for the expected number of fields  
                    print(f"Skipping row: {row} - unexpected number of columns")  
                    continue  
                cursor.execute("""  
                INSERT INTO books (title, author, genre, publisher, year_of_publication, isbn, description, language, image)  
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)  
                """, row)  
                print(f"Inserted: {row}")  # Log successful insertions  
            except Exception as insert_error:  
                print(f"Failed to insert row: {row} - Error: {insert_error}")  

    conn.commit()  # Commit the transaction after all inserts  
    print("Data inserted successfully!")  

except Exception as e:  
    print(f"Error: {e}")  

finally:  
    # Close the database connection  
    if 'cursor' in locals() and cursor:  
        cursor.close()  
    if 'conn' in locals() and conn:  
        conn.close()  
    print("Database connection closed.")