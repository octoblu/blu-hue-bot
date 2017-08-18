#!/bin/bash
# Script reads .env file for variables and exports the variables to the environment
file=.env
echo "Reading .env file"
while read line; do
  # echo "Exporting: " $line
  export $line;
done < $file
echo "Successfully exported each line"
