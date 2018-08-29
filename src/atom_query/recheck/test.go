package main

import "fmt"
import "io/ioutil"
import "strings"
import "strconv"

func main() {
	fmt.Println("vim-go")
	//bz, err := ioutil.ReadFile("expected_allocations.ordered.txt")
	bz, err := ioutil.ReadFile("fundraiser_atoms.json")
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
		addr := pparts[0]
		amnt := pparts[1]
		amntf, err := strconv.ParseFloat(amnt, 64)
		if err != nil {
			panic(err)
		}
		amnti := int64(amntf)
		amnti /= 10
		amnti *= 10
		amntfs := fmt.Sprintf("%d", amnti)
		fmt.Printf("%v,%v\n", addr, amntfs)
	}
}
