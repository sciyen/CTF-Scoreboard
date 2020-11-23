# CTF-Scoreboard
This is a simple CTF competition platform, including serveral Flag Listener and a scoreboard server which will provide a visualizied scores information. In summary, there are two components need to be activated: Flag Listener Server(Service) and Scoreboard Server.

# Flag Listener Server
The server will automatically read `game config` file and create the corresponding GET path to handle with the coming request, and tranfer them to scoreboard server so as to prevent malicious requests.

## Dependencies
It containing a `pipenv` environment so you can just run
```
$ pipenv install
```
to install them, and run
```
$ pipenv shell
```
to enter the environment.

- Python3.5 or above
- Packages
    - requests
    - http (It should be automatically installed in python3)

## Configuration
There are serveral information need to be given:
- Scoreboard server url
- Scoreboard server port
- Game rule config file path (The game config file for scoreboard)

## Run the server
```
$ python3 flag_server.py
```

# Scoreboard Server
## Dependencies
- Nodejs
- Packages: Use `npm` or `yarn` to install the following packages.
    - express
    - fs

## Configuration
There are serveral json file need to configure before runing the server.
- game.json: Describing the game rules.
- team_config.json: Describing the team setting and machines configurations.

## Create new rule descriptor 
There is a `RuleDescriptor` prototype class defined in ScoreCalculator.js module, one should inherit the class to add a new rule. There are serveral procedures need to do when you start up a new rule:
1. Inherit the class `RuleDescriptor`
2. Providing `calc_score(req, scores, callback)` function to handle a flag, the `callback` function is for handling the responding messages. And this function should return the scores back for updating.
3. Providing a `check_valid_input(req, flag)` to check if the input request is valid, and this function should be called in `calc_score()` function.
4. Create a instance of your new rule descriptor in `serv.js`, and add a new case in `/flag` request handler.

## Run the server
```
node serv.js
```
