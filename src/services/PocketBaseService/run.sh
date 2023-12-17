#!/bim/bash

./pocketbase serve --http 0.0.0.0:8090 &
pid1=$!

# Start the second process in the background
# process2 &
# pid2=$!

# Wait for either process to exit
wait -n
exit_status=$?

# Kill the remaining process (if any)
kill $pid1 2>/dev/null
kill $pid2 2>/dev/null

# Exit with the captured exit status
exit $exit_status