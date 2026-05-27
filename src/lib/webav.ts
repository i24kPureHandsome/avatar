import { Combinator } from "@webav/av-cliper";

export const webavWriteStream = async (outputFile: string, com: Combinator) => {
    return new Promise((resolve, reject) => {
        com.on("error", (e) => {
            console.error("webavWriteStream error", e);
            reject("webavWriteStream error: " + e);
        });
        $mapi.file
            .writeStream(outputFile, com.output())
            .then(() => {
                $mapi.file
                    .exists(outputFile)
                    .then((exists) => {
                        if (!exists) {
                            reject(
                                "webavWriteStream writeStream error: file not exists after write",
                            );
                            return;
                        }
                        resolve(true);
                    })
                    .catch((e) => {
                        console.error("webavWriteStream exists error", e);
                        reject("webavWriteStream exists error: " + e);
                    });
            })
            .catch((e) => {
                console.error("webavWriteStream writeStream error", e);
                reject("webavWriteStream writeStream error: " + e);
            });
    });
};

export const webavCombinator = (option: { width: number; height: number }) => {
    const com = new Combinator({
        width: option.width,
        height: option.height,
        bgColor: "black",
        __unsafe_hardwareAcceleration__: "prefer-software",
    });
    return com;
};
