function op2env {
    local filename="$1"

    # Run op2env-print with all arguments and capture its output
    local output
    output=$(op2env-print "$@")
    if [ $? -ne 0 ]; then
        return $?
    fi

    # Split the output into lines
    local lines
    IFS=$'\n' lines=("${(@f)output}")

    # Process each line
    for line in "${lines[@]}"; do
        if [[ $line =~ ^([^=]+)=(.*)$ ]]; then
            local key="${MATCH[1]}"
            local value="${MATCH[2]}"
            export "$key=$value"
        fi
    done
}
