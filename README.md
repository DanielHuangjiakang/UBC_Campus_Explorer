# CPSC 310 Project Repository

This repository contains starter code for the class project.
Please keep your repository private.

For information about the project, autotest, and the checkpoints, see the course webpage.

## Explore Our Interactive Interface

Below are previews of our interactive frontend interface, showcasing data visualizations and map features:

![Campus Explorer Frontend](img/campus_explorer_frontend2.png)

<p align="center">
  <img src="img/campus_explorer_frontend_map.png" alt="Campus Explorer Frontend Map" width="40%">
  <img src="img/campus_explorer_frontend_bar.png" alt="Campus Explorer Frontend Bar Chart" width="56%">
</p>



## Project Overview

This project features a RESTful API for querying and analyzing campus building and room data. It processes dataset uploads, handles queries, and provides insights. The frontend visualizes results, allowing users to explore room capacities, filter data dynamically, and plan walking routes between buildings using the Google Maps API.

Key Features:
- Upload, query, and delete datasets related to campus rooms and buildings.
- Interactive frontend for visualizing room capacities using bar charts.
- RESTful API design emphasizing idempotency, statelessness, and connectedness.
- Integrated Google Maps JavaScript API for dynamic rendering of campus buildings and calculating walking paths between locations with custom markers.
- Comprehensive testing strategy combining unit tests for the backend and end-to-end tests for the frontend.

Technologies Used:
- **Frontend:** HTML, CSS, JavaScript, Google Maps JavaScript API.
- **Backend:** TypeScript, Node.js, RESTful API.
- **Testing:** Mocha for unit testing API endpoints and backend logic.
- **Design Principles:** SOLID principles for scalable and maintainable code structure.

## Configuring your environment

To start using this project, you need to get your development environment configured so that you can build and execute the code.
To do this, follow these steps; the specifics of each step will vary based on your operating system:

1. [Install git](https://git-scm.com/downloads) (v2.X). You should be able to execute `git --version` on the command line after installation is complete.

1. [Install Node LTS](https://nodejs.org/en/download/) (LTS: v18.X), which will also install NPM (you should be able to execute `node --version` and `npm --version` on the command line).

1. [Install Yarn](https://yarnpkg.com/en/docs/install) (1.22.X). You should be able to execute `yarn --version`.

1. Clone your repository by running `git clone REPO_URL` from the command line. You can get the REPO_URL by clicking on the green button on your project repository page on GitHub. Note that due to new department changes you can no longer access private git resources using https and a username and password. You will need to use either [an access token](https://help.github.com/en/github/authenticating-to-github/creating-a-personal-access-token-for-the-command-line) or [SSH](https://help.github.com/en/github/authenticating-to-github/adding-a-new-ssh-key-to-your-github-account).

## Project commands

Once your environment is configured you need to further prepare the project's tooling and dependencies.
In the project folder:

1. `yarn install` to download the packages specified in your project's *package.json* to the *node_modules* directory.

1. `yarn build` to compile your project. You must run this command after making changes to your TypeScript files. If it does not build locally, AutoTest will not be able to build it. This will also run formatting and linting, so make sure to fix those errors too!

1. `yarn test` to run the test suite.
    - To run with coverage, run `yarn cover`

1. `yarn prettier:fix` to format your project code.

1. `yarn lint:check` to see lint errors in your project code. You may be able to fix some of them using the `yarn lint:fix` command.


If you are curious, some of these commands are actually shortcuts defined in [package.json -> scripts](./package.json).

## Running and testing from an IDE

IntelliJ Ultimate should be automatically configured the first time you open the project (IntelliJ Ultimate is a free download through the [JetBrains student program](https://www.jetbrains.com/community/education/#students/)).

### License

While the readings for this course are licensed using [CC-by-SA](https://creativecommons.org/licenses/by-sa/3.0/), **checkpoint descriptions and implementations are considered private materials**. Please do not post or share your project solutions. We go to considerable lengths to make the project an interesting and useful learning experience for this course. This is a great deal of work, and while future students may be tempted by your solutions, posting them does not do them any real favours. Please be considerate with these private materials and not pass them along to others, make your repos public, or post them to other sites online.
