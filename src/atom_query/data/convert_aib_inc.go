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
		b32pub := part
		_, b32pub2 := bech32ToBech32(b32pub)
		fmt.Println(b32pub2)
	}
}
