#!/bin/bash

API_URL="http://localhost:1337"
NUM_USERS=${1:-5}  # Default to 5 users if no argument provided

echo "Creating $NUM_USERS users..."

for i in $(seq 1 $NUM_USERS); do
  echo "Creating testuser$i..."
  
  curl -X POST "$API_URL/api/auth/local/register" \
    -H "Content-Type: application/json" \
    -d "{
      \"username\": \"testuser$i\",
      \"email\": \"testuser$i@example.com\",
      \"password\": \"password123\",
      \"confirmed\": true
    }" \
    -w "\nStatus: %{http_code}\n" \
    -s
  
  echo -e "\n---\n"
  
  # Small delay
  sleep 0.1
done

echo "Finished creating users!"