package main

import (
	"fmt"
	"os"

	"github.com/giulianopz/go-readability"
	"github.com/yosssi/gohtml"
)

func main() {
	file := os.Args[1]
	uri := os.Args[2]
	source, err := os.ReadFile(file)
	if err != nil {
		panic(err)
	}
	reader, err := readability.New(
		string(source),
		uri,
		readability.ClassesToPreserve("caption"),
	)
	if err != nil {
		panic(err)
	}
	result, err := reader.Parse()
	if err != nil {
		panic(err)
	}
	fmt.Println(gohtml.Format(result.HTMLContent))
}
