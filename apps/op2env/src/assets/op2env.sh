op2env() {
    local filename="$1"

    # Run op2env-print with all arguments and capture its output
    local output=$(op2env-print "$@")
    local status=$?
    if [ $status -ne 0 ]; then
        return $status
    fi

    # Split the output into lines
    local lines=$(echo "$output" | tr '\n' ' ')

    # Process each line
    while IFS= read -r line; do
        local key="${line%%=*}"
        local value="${line#*=}"

        if (( ${#key} > 0 )); then
            export "$key"="$value"
        fi
    done <<< "$output"
}
