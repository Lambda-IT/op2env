# nx-op2env

`nx-op2env` is an nx plugin to retrieve secrets from 1password and set them as environment variables.
It will then execute a "child" executor which will have access to the secrets as environment variables.

## Usage

### Executor `op2env`

This executor will retrieve secrets from 1password and set them as environment variables, then execute a "child" executor which will have access to the secrets as environment variables.

For example, in a standard Node.js project, you can rename the `serve` target in your project's `project.json` to `_serve`, then use `op2env` like this:

```json
        "serve": {
            "executor": "@lambda-it/nx-op2env:op2env",
            "options": {
                "childTarget": "serve"
            }
        }
```
