package main

import (
	"fmt"
	"io/ioutil"
	"os"
	"strconv"
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
	b64strbz, err := amino.MarshalJSON(bz)
	if err != nil {
		panic(err)
	}
	b64str := string(b64strbz[1 : len(b64strbz)-1])
	return bz, b64str
}

func main() {
	bz, err := ioutil.ReadFile("aib_employees.txt")
	if err != nil {
		panic(err)
	}
	str := string(bz)
	parts := strings.Split(str, "\n")
	fmt.Println(len(parts), parts[:2], parts[len(parts)-2:], len(parts))

	for _, part := range parts {
		if strings.TrimSpace(part) == "" {
			continue
		}
		pparts := strings.Split(part, ",")
		if len(pparts) != 2 {
			panic("unexpected part " + part)
		}
		b32pub := pparts[0]
		amnt := pparts[1]
		amntf, err := strconv.ParseFloat(amnt, 64)
		if err != nil {
			panic(err)
		}
		_, b64pub := bech32ToBase64(b32pub)
		fmt.Printf("\"%v\":%v\n", b64pub, amntf)
	}
}
