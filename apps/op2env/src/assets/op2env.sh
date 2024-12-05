op2env() {
    local filename="$1"

    # Run op2env-print with all arguments and capture its output
    local output
    output=$(op2env-print "$@")
    if [ $? -ne 0 ]; then
        return $?
    fi

    # Split the output into lines
    IFS=$'\n' read -rd '' -a lines <<<"$output"

    # Process each line
    for line in "${lines[@]}"; do
        if [[ $line =~ ^([^=]+)=(.*)$ ]]; then
            local key="${BASH_REMATCH[1]}"
            local value="${BASH_REMATCH[2]}"
            export "$key=$value"
        fi
    done
}
