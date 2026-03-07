CREATE TABLE IF NOT EXISTS demo_users (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  department TEXT NOT NULL
);

DELETE FROM demo_users;

INSERT INTO demo_users (id, name, email, department) VALUES
  (1, 'Alice', 'alice@example.com', 'Finance'),
  (2, 'Bob', 'bob@example.com', 'Operations'),
  (3, 'Carol', 'carol@example.com', 'Engineering');
