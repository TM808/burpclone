#!/bin/bash

# Script to create a ZIP package of all remote access tools

echo "Creating remote access package..."

# Check if zip command is available
if ! command -v zip &> /dev/null; then
    echo "Error: zip command not found. Please install zip first."
    exit 1
fi

# Create the ZIP file
zip -r remote_access_package.zip \
    README.md \
    remote_access.sh \
    remote_access.py \
    remote_access.bat \
    remote_access.php \
    index.html

if [ $? -eq 0 ]; then
    echo "Package created successfully: remote_access_package.zip"
    echo "This package contains all necessary files for remote access."
    echo "Please refer to README.md for usage instructions."
else
    echo "Error: Failed to create package."
    exit 1
fi

exit 0