package main

import (
	"fmt"
	"io/ioutil"
	"os"
	"strings"

	"github.com/tendermint/go-amino"
	"github.com/tendermint/tendermint/libs/bech32"
)

var flagHelp bool
var cdc *amino.Codec

func init() {
	cdc = amino.NewCodec()
}

func bech32ToBase64(bech32str string) ([]byte, string) {
	_, bz, err := bech32.DecodeAndConvert(bech32str)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error decoding bech32: %s\n", err)
		panic(err)
	}
	if len(bz) == 38 {
		bz = bz[5:]
	} else if len(bz) != 33 {
		panic("unexpected pubbz length")
	}
	b64strbz, err := amino.MarshalJSON(bz)
	if err != nil {
		panic(err)
	}
	b64str := string(b64strbz[1 : len(b64strbz)-1])
	return bz, b64str
}

func main() {
	bz, err := ioutil.ReadFile("aib_inc.txt")
	if err != nil {
		panic(err)
	}
	str := string(bz)
	parts := strings.Split(str, "\n")

	for _, part := range parts {
		if strings.TrimSpace(part) == "" {
			continue
		}
		b32pub := part
		_, b64pub := bech32ToBase64(b32pub)
		fmt.Printf(`{
  "pub_key": {
    "type": "tendermint/PubKeySecp256k1",
	"value": "%v"
  }
},
`, b64pub)
	}
}
