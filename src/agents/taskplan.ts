export const tasks: {
    name: string,
    description: string,
    dependencies: string[],
}[] =   [
    {
      "name": "generate_compose",
      "description": "Generates a Docker Compose file based on input parameters.",
      "dependencies": []
    },
    {
      "name": "run_container",
      "description": "Runs a Docker container based on the provided configuration.",
      "dependencies": ["generate_compose"]
    },
    {
      "name": "execute_project",
      "description": "Install dependencies and run a project in running Docker container.",
      "dependencies": ["generate_compose", "run_container"]
    },
    {
      "name": "delete_container",
      "description": "Deletes a Docker container.",
      "dependencies": []
    },
    {
      "name": "generate_tests",
      "description": "Generates test cases for java code based on given focal method",
      "dependencies": []
    },
    {
      "name": "run_tests",
      "description": "Runs generated test cases for java code based on given focal method",
      "dependencies": ["generate_tests"]
    },
    {
      "name": "save_tests",
      "description": "Save generated test cases for java code based on given focal method",
      "dependencies": ["generate_tests","run_tests"]
    },
    {
      "name": "fix_tests",
      "description": "Addresses issues identified during test execution to ensure desired behavior.",
      "dependencies": ["generate_tests","run_tests","save_tests"]
    }
  ]