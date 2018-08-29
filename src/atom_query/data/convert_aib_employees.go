package main

import (
	"fmt"
	"io/ioutil"
	"os"
	"strconv"
	"strings"

	"github.com/tendermint/go-amino"
	camino "github.com/tendermint/tendermint/crypto/encoding/amino"
	"github.com/tendermint/tendermint/libs/bech32"
)

var flagHelp bool
var cdc *amino.Codec

func init() {
	cdc = amino.NewCodec()
}

func parseBech32(bech32str string) []byte {
	_, bz, err := bech32.DecodeAndConvert(bech32str)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error decoding bech32: %s\n", err)
		panic(err)
	}
	return bz
}

func main() {
	bz, err := ioutil.ReadFile("aib_employees.txt")
	if err != nil {
		panic(err)
	}
	str := string(bz)
	parts := strings.Split(str, "\n")

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
		bz := parseBech32(b32pub)
		pub, err := camino.PubKeyFromBytes(bz)
		if err != nil {
			panic(err)
		}
		addr := pub.Address()
		b32addr, err := bech32.ConvertAndEncode("cosmos", addr)
		if err != nil {
			panic(err)
		}

		fmt.Printf("{\"addr\":\"%v\",\"amount\":%v,\"lock\":\"1 year\",\"vesting\":\"2 years\"},\n", b32addr, amntf)
	}
}
