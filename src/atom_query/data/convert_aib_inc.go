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

func bech32ToBech32(bech32str string) ([]byte, string) {
	_, bz, err := bech32.DecodeAndConvert(bech32str)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error decoding bech32: %s\n", err)
		panic(err)
	}
	if len(bz) == 38 {
		// good.
	} else if len(bz) == 33 {
		bz = append([]byte{0xEB, 0x5A, 0xE9, 0x87, 0x21}, bz...)
	} else {
		panic("unexpected pubbz length")
	}
	bech32str2, err := bech32.ConvertAndEncode("cosmospub", bz)
	if err != nil {
		panic(err)
	}
	return bz, bech32str2
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
		pparts := strings.Split(part, ",")
		if len(pparts) != 3 {
			panic("expected format of type,b32addressish,number")
		}
		typ := pparts[0]
		b32pub := pparts[1]
		amnt := pparts[2]
		amntf, err := strconv.ParseFloat(amnt, 64)
		if err != nil {
			panic(err)
		}
		bz, b32pub2 := bech32ToBech32(b32pub)
		if typ == "a" {
			pub, err := camino.PubKeyFromBytes(bz)
			if err != nil {
				panic(err)
			}
			addr := pub.Address()
			b32addr, err := bech32.ConvertAndEncode("cosmos", addr)
			if err != nil {
				panic(err)
			}
			fmt.Printf(`{"addr":"%v","amount":%.2f,"lock":"1 year"},`+"\n", b32addr, amntf)
		} else if typ == "p" {
			fmt.Printf(`{"pub":"%v","amount":%.2f},`+"\n", b32pub2, amntf)
		}
	}
}
