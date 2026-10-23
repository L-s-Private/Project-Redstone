package com.staticarc.bridge;

/** 要求の内容が不正なとき。メッセージはそのままアプリに返して表示する。 */
public class InvalidRequestException extends Exception {
    public InvalidRequestException(String message) {
        super(message);
    }
}
