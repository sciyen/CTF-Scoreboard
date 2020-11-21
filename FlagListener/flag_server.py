import http.server
import urllib.parse as urlparse
import requests
import time

SCOREBOARD_SERVER = r"http://nckuvincent.ddns.net"
SCOREBOARD_PORT = "10418"

PORT = 11234
CONTAIN_PORT_INFO = False

class GetHandler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        status_code = 200
        r = None
        parsed_path = urlparse.urlparse(self.path)
        if ( parsed_path.path == "/flag" ):
            query = parsed_path.query
            if ( query != "" ):
                query_d = dict(qc.split("=") for qc in query.split("&"))
                print(query_d)
                if CONTAIN_PORT_INFO:
                    req_ip = self.client_address[0] + ':' + str(self.client_address[1])
                else:
                    req_ip = self.client_address[0]
                req_url = (SCOREBOARD_SERVER + ':' + SCOREBOARD_PORT + 
                    "/flag?flag={}&ip={}&time={}".format(query_d['flag'], req_ip, time.time()))
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
