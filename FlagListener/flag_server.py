import http.server
import urllib.parse as urlparse
import requests
import time
import json

SCOREBOARD_SERVER = r"http://nckuvincent.ddns.net"
SCOREBOARD_PORT = "10418"

TEAM_CONFIG_FILE = "../ScoreBoard/configs/game.json"

f = open(TEAM_CONFIG_FILE, 'r')
rules = json.loads(f.read())
query_table = {}
for rule in rules:
    query_table['/'+rule] = rules[rule]['Query']

print(query_table)

PORT = 11234
CONTAIN_PORT_INFO = False

class GetHandler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        status_code = 200
        r = None
        parsed_path = urlparse.urlparse(self.path)
        if ( parsed_path.path in query_table ):
            query = parsed_path.query
            if ( query != "" ):
                query_d = dict(qc.split("=") for qc in query.split("&"))
                print(query_d)
                if CONTAIN_PORT_INFO:
                    req_ip = self.client_address[0] + ':' + str(self.client_address[1])
                else:
                    req_ip = self.client_address[0]
                req_url = (SCOREBOARD_SERVER + ':' + SCOREBOARD_PORT + 
                        "/flag?type={}&{}&ip={}&time={}".format(
                            parsed_path.path[1:], query, req_ip, time.time()))
                print(req_url)
                r = requests.get(req_url)
                print(r.status_code)
                if (r.status_code != 200):
                    # 405 means method not allowed
                    status_code = 405   
            else:
                # 400 means bad request
                status_code = 400
        else:
            # 400 means bad request
            print("No match path found")
            status_code = 400
        self.send_response(status_code)
        self.end_headers()
        # Return what scoreboard server responsed to requesting host
        if r is not None:
            self.wfile.write(r.content)
        return

if __name__ == '__main__':
    server = http.server.HTTPServer(('0.0.0.0', PORT), GetHandler)
    print('Flag listener starting on {}'.format(PORT))
    server.serve_forever()
