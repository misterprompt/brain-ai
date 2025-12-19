FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy code
COPY . .

# Make entrypoint executable
RUN chmod +x entrypoint.sh

# Run via entrypoint script
CMD ["./entrypoint.sh"]
