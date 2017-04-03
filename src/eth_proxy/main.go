package main

import (
	"bytes"
	"encoding/hex"
	"encoding/json"
	"io/ioutil"
	"net/http"
	"strings"
)

const BaseUrl = "http://localhost:8545"
const ListeningPort = "8080"

func main() {
	// intercept call
	http.HandleFunc("/eth/", HandleRequest)
	http.ListenAndServe(":"+ListeningPort, nil)
}

func HandleRequest(w http.ResponseWriter, r *http.Request) {
	p := strings.Split(r.URL.Path[1:], "/")
	if len(p) != 3 {
		httpError(w, "Bad path")
		return
	}

	addr := p[1]
	data := p[2]

	// addr is 0x prefixed, 20 bytes
	if len(addr) != 42 {
		httpError(w, "Bad address")
		return
	}
	// data is 0x prefixed, 4 bytes
	if len(data) != 10 {
		httpError(w, "Bad data")
		return
	}

	// addr and data must be valid hex
	if _, err := hex.DecodeString(addr[2:]); err != nil {
		httpError(w, "Bad addr")
		return
	}
	if _, err := hex.DecodeString(data[2:]); err != nil {
		httpError(w, "Bad data")
		return
	}

	// Make json rpc request
	params := CallParams{addr, data}
	jsonR := JSONRPC{
		ID:      "1",
		JSONRPC: "2.0",
		Method:  "eth_call",
		Params:  []CallParams{params},
	}
	rString, _ := json.Marshal(jsonR)

	resp, err := http.Post(BaseUrl, "application/json", bytes.NewBuffer(rString))
	if err != nil {
		httpError(w, err.Error())
		return
	}
	defer resp.Body.Close()
	b, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		httpError(w, err.Error())
		return
	}

	w.Write(b)
}

type JSONRPC struct {
	ID      string       `json:"id"`
	JSONRPC string       `json:"jsonrpc"`
	Method  string       `json:"method"`
	Params  []CallParams `json:"params"`
}

type CallParams struct {
	To   string `json:"to"`
	Data string `json:"data"`
}

func httpError(w http.ResponseWriter, errStr string) {
	w.WriteHeader(http.StatusBadRequest)
	w.Write([]byte(errStr + "\n"))
}
