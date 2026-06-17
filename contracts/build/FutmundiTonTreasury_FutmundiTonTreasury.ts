import {
    Cell,
    Slice,
    Address,
    Builder,
    beginCell,
    ComputeError,
    TupleItem,
    TupleReader,
    Dictionary,
    contractAddress,
    address,
    ContractProvider,
    Sender,
    Contract,
    ContractABI,
    ABIType,
    ABIGetter,
    ABIReceiver,
    TupleBuilder,
    DictionaryValue
} from '@ton/core';

export type DataSize = {
    $$type: 'DataSize';
    cells: bigint;
    bits: bigint;
    refs: bigint;
}

export function storeDataSize(src: DataSize) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeInt(src.cells, 257);
        b_0.storeInt(src.bits, 257);
        b_0.storeInt(src.refs, 257);
    };
}

export function loadDataSize(slice: Slice) {
    const sc_0 = slice;
    const _cells = sc_0.loadIntBig(257);
    const _bits = sc_0.loadIntBig(257);
    const _refs = sc_0.loadIntBig(257);
    return { $$type: 'DataSize' as const, cells: _cells, bits: _bits, refs: _refs };
}

export function loadTupleDataSize(source: TupleReader) {
    const _cells = source.readBigNumber();
    const _bits = source.readBigNumber();
    const _refs = source.readBigNumber();
    return { $$type: 'DataSize' as const, cells: _cells, bits: _bits, refs: _refs };
}

export function loadGetterTupleDataSize(source: TupleReader) {
    const _cells = source.readBigNumber();
    const _bits = source.readBigNumber();
    const _refs = source.readBigNumber();
    return { $$type: 'DataSize' as const, cells: _cells, bits: _bits, refs: _refs };
}

export function storeTupleDataSize(source: DataSize) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.cells);
    builder.writeNumber(source.bits);
    builder.writeNumber(source.refs);
    return builder.build();
}

export function dictValueParserDataSize(): DictionaryValue<DataSize> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeDataSize(src)).endCell());
        },
        parse: (src) => {
            return loadDataSize(src.loadRef().beginParse());
        }
    }
}

export type SignedBundle = {
    $$type: 'SignedBundle';
    signature: Buffer;
    signedData: Slice;
}

export function storeSignedBundle(src: SignedBundle) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeBuffer(src.signature);
        b_0.storeBuilder(src.signedData.asBuilder());
    };
}

export function loadSignedBundle(slice: Slice) {
    const sc_0 = slice;
    const _signature = sc_0.loadBuffer(64);
    const _signedData = sc_0;
    return { $$type: 'SignedBundle' as const, signature: _signature, signedData: _signedData };
}

export function loadTupleSignedBundle(source: TupleReader) {
    const _signature = source.readBuffer();
    const _signedData = source.readCell().asSlice();
    return { $$type: 'SignedBundle' as const, signature: _signature, signedData: _signedData };
}

export function loadGetterTupleSignedBundle(source: TupleReader) {
    const _signature = source.readBuffer();
    const _signedData = source.readCell().asSlice();
    return { $$type: 'SignedBundle' as const, signature: _signature, signedData: _signedData };
}

export function storeTupleSignedBundle(source: SignedBundle) {
    const builder = new TupleBuilder();
    builder.writeBuffer(source.signature);
    builder.writeSlice(source.signedData.asCell());
    return builder.build();
}

export function dictValueParserSignedBundle(): DictionaryValue<SignedBundle> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeSignedBundle(src)).endCell());
        },
        parse: (src) => {
            return loadSignedBundle(src.loadRef().beginParse());
        }
    }
}

export type StateInit = {
    $$type: 'StateInit';
    code: Cell;
    data: Cell;
}

export function storeStateInit(src: StateInit) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeRef(src.code);
        b_0.storeRef(src.data);
    };
}

export function loadStateInit(slice: Slice) {
    const sc_0 = slice;
    const _code = sc_0.loadRef();
    const _data = sc_0.loadRef();
    return { $$type: 'StateInit' as const, code: _code, data: _data };
}

export function loadTupleStateInit(source: TupleReader) {
    const _code = source.readCell();
    const _data = source.readCell();
    return { $$type: 'StateInit' as const, code: _code, data: _data };
}

export function loadGetterTupleStateInit(source: TupleReader) {
    const _code = source.readCell();
    const _data = source.readCell();
    return { $$type: 'StateInit' as const, code: _code, data: _data };
}

export function storeTupleStateInit(source: StateInit) {
    const builder = new TupleBuilder();
    builder.writeCell(source.code);
    builder.writeCell(source.data);
    return builder.build();
}

export function dictValueParserStateInit(): DictionaryValue<StateInit> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeStateInit(src)).endCell());
        },
        parse: (src) => {
            return loadStateInit(src.loadRef().beginParse());
        }
    }
}

export type Context = {
    $$type: 'Context';
    bounceable: boolean;
    sender: Address;
    value: bigint;
    raw: Slice;
}

export function storeContext(src: Context) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeBit(src.bounceable);
        b_0.storeAddress(src.sender);
        b_0.storeInt(src.value, 257);
        b_0.storeRef(src.raw.asCell());
    };
}

export function loadContext(slice: Slice) {
    const sc_0 = slice;
    const _bounceable = sc_0.loadBit();
    const _sender = sc_0.loadAddress();
    const _value = sc_0.loadIntBig(257);
    const _raw = sc_0.loadRef().asSlice();
    return { $$type: 'Context' as const, bounceable: _bounceable, sender: _sender, value: _value, raw: _raw };
}

export function loadTupleContext(source: TupleReader) {
    const _bounceable = source.readBoolean();
    const _sender = source.readAddress();
    const _value = source.readBigNumber();
    const _raw = source.readCell().asSlice();
    return { $$type: 'Context' as const, bounceable: _bounceable, sender: _sender, value: _value, raw: _raw };
}

export function loadGetterTupleContext(source: TupleReader) {
    const _bounceable = source.readBoolean();
    const _sender = source.readAddress();
    const _value = source.readBigNumber();
    const _raw = source.readCell().asSlice();
    return { $$type: 'Context' as const, bounceable: _bounceable, sender: _sender, value: _value, raw: _raw };
}

export function storeTupleContext(source: Context) {
    const builder = new TupleBuilder();
    builder.writeBoolean(source.bounceable);
    builder.writeAddress(source.sender);
    builder.writeNumber(source.value);
    builder.writeSlice(source.raw.asCell());
    return builder.build();
}

export function dictValueParserContext(): DictionaryValue<Context> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeContext(src)).endCell());
        },
        parse: (src) => {
            return loadContext(src.loadRef().beginParse());
        }
    }
}

export type SendParameters = {
    $$type: 'SendParameters';
    mode: bigint;
    body: Cell | null;
    code: Cell | null;
    data: Cell | null;
    value: bigint;
    to: Address;
    bounce: boolean;
}

export function storeSendParameters(src: SendParameters) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeInt(src.mode, 257);
        if (src.body !== null && src.body !== undefined) { b_0.storeBit(true).storeRef(src.body); } else { b_0.storeBit(false); }
        if (src.code !== null && src.code !== undefined) { b_0.storeBit(true).storeRef(src.code); } else { b_0.storeBit(false); }
        if (src.data !== null && src.data !== undefined) { b_0.storeBit(true).storeRef(src.data); } else { b_0.storeBit(false); }
        b_0.storeInt(src.value, 257);
        b_0.storeAddress(src.to);
        b_0.storeBit(src.bounce);
    };
}

export function loadSendParameters(slice: Slice) {
    const sc_0 = slice;
    const _mode = sc_0.loadIntBig(257);
    const _body = sc_0.loadBit() ? sc_0.loadRef() : null;
    const _code = sc_0.loadBit() ? sc_0.loadRef() : null;
    const _data = sc_0.loadBit() ? sc_0.loadRef() : null;
    const _value = sc_0.loadIntBig(257);
    const _to = sc_0.loadAddress();
    const _bounce = sc_0.loadBit();
    return { $$type: 'SendParameters' as const, mode: _mode, body: _body, code: _code, data: _data, value: _value, to: _to, bounce: _bounce };
}

export function loadTupleSendParameters(source: TupleReader) {
    const _mode = source.readBigNumber();
    const _body = source.readCellOpt();
    const _code = source.readCellOpt();
    const _data = source.readCellOpt();
    const _value = source.readBigNumber();
    const _to = source.readAddress();
    const _bounce = source.readBoolean();
    return { $$type: 'SendParameters' as const, mode: _mode, body: _body, code: _code, data: _data, value: _value, to: _to, bounce: _bounce };
}

export function loadGetterTupleSendParameters(source: TupleReader) {
    const _mode = source.readBigNumber();
    const _body = source.readCellOpt();
    const _code = source.readCellOpt();
    const _data = source.readCellOpt();
    const _value = source.readBigNumber();
    const _to = source.readAddress();
    const _bounce = source.readBoolean();
    return { $$type: 'SendParameters' as const, mode: _mode, body: _body, code: _code, data: _data, value: _value, to: _to, bounce: _bounce };
}

export function storeTupleSendParameters(source: SendParameters) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.mode);
    builder.writeCell(source.body);
    builder.writeCell(source.code);
    builder.writeCell(source.data);
    builder.writeNumber(source.value);
    builder.writeAddress(source.to);
    builder.writeBoolean(source.bounce);
    return builder.build();
}

export function dictValueParserSendParameters(): DictionaryValue<SendParameters> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeSendParameters(src)).endCell());
        },
        parse: (src) => {
            return loadSendParameters(src.loadRef().beginParse());
        }
    }
}

export type MessageParameters = {
    $$type: 'MessageParameters';
    mode: bigint;
    body: Cell | null;
    value: bigint;
    to: Address;
    bounce: boolean;
}

export function storeMessageParameters(src: MessageParameters) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeInt(src.mode, 257);
        if (src.body !== null && src.body !== undefined) { b_0.storeBit(true).storeRef(src.body); } else { b_0.storeBit(false); }
        b_0.storeInt(src.value, 257);
        b_0.storeAddress(src.to);
        b_0.storeBit(src.bounce);
    };
}

export function loadMessageParameters(slice: Slice) {
    const sc_0 = slice;
    const _mode = sc_0.loadIntBig(257);
    const _body = sc_0.loadBit() ? sc_0.loadRef() : null;
    const _value = sc_0.loadIntBig(257);
    const _to = sc_0.loadAddress();
    const _bounce = sc_0.loadBit();
    return { $$type: 'MessageParameters' as const, mode: _mode, body: _body, value: _value, to: _to, bounce: _bounce };
}

export function loadTupleMessageParameters(source: TupleReader) {
    const _mode = source.readBigNumber();
    const _body = source.readCellOpt();
    const _value = source.readBigNumber();
    const _to = source.readAddress();
    const _bounce = source.readBoolean();
    return { $$type: 'MessageParameters' as const, mode: _mode, body: _body, value: _value, to: _to, bounce: _bounce };
}

export function loadGetterTupleMessageParameters(source: TupleReader) {
    const _mode = source.readBigNumber();
    const _body = source.readCellOpt();
    const _value = source.readBigNumber();
    const _to = source.readAddress();
    const _bounce = source.readBoolean();
    return { $$type: 'MessageParameters' as const, mode: _mode, body: _body, value: _value, to: _to, bounce: _bounce };
}

export function storeTupleMessageParameters(source: MessageParameters) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.mode);
    builder.writeCell(source.body);
    builder.writeNumber(source.value);
    builder.writeAddress(source.to);
    builder.writeBoolean(source.bounce);
    return builder.build();
}

export function dictValueParserMessageParameters(): DictionaryValue<MessageParameters> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeMessageParameters(src)).endCell());
        },
        parse: (src) => {
            return loadMessageParameters(src.loadRef().beginParse());
        }
    }
}

export type DeployParameters = {
    $$type: 'DeployParameters';
    mode: bigint;
    body: Cell | null;
    value: bigint;
    bounce: boolean;
    init: StateInit;
}

export function storeDeployParameters(src: DeployParameters) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeInt(src.mode, 257);
        if (src.body !== null && src.body !== undefined) { b_0.storeBit(true).storeRef(src.body); } else { b_0.storeBit(false); }
        b_0.storeInt(src.value, 257);
        b_0.storeBit(src.bounce);
        b_0.store(storeStateInit(src.init));
    };
}

export function loadDeployParameters(slice: Slice) {
    const sc_0 = slice;
    const _mode = sc_0.loadIntBig(257);
    const _body = sc_0.loadBit() ? sc_0.loadRef() : null;
    const _value = sc_0.loadIntBig(257);
    const _bounce = sc_0.loadBit();
    const _init = loadStateInit(sc_0);
    return { $$type: 'DeployParameters' as const, mode: _mode, body: _body, value: _value, bounce: _bounce, init: _init };
}

export function loadTupleDeployParameters(source: TupleReader) {
    const _mode = source.readBigNumber();
    const _body = source.readCellOpt();
    const _value = source.readBigNumber();
    const _bounce = source.readBoolean();
    const _init = loadTupleStateInit(source);
    return { $$type: 'DeployParameters' as const, mode: _mode, body: _body, value: _value, bounce: _bounce, init: _init };
}

export function loadGetterTupleDeployParameters(source: TupleReader) {
    const _mode = source.readBigNumber();
    const _body = source.readCellOpt();
    const _value = source.readBigNumber();
    const _bounce = source.readBoolean();
    const _init = loadGetterTupleStateInit(source);
    return { $$type: 'DeployParameters' as const, mode: _mode, body: _body, value: _value, bounce: _bounce, init: _init };
}

export function storeTupleDeployParameters(source: DeployParameters) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.mode);
    builder.writeCell(source.body);
    builder.writeNumber(source.value);
    builder.writeBoolean(source.bounce);
    builder.writeTuple(storeTupleStateInit(source.init));
    return builder.build();
}

export function dictValueParserDeployParameters(): DictionaryValue<DeployParameters> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeDeployParameters(src)).endCell());
        },
        parse: (src) => {
            return loadDeployParameters(src.loadRef().beginParse());
        }
    }
}

export type StdAddress = {
    $$type: 'StdAddress';
    workchain: bigint;
    address: bigint;
}

export function storeStdAddress(src: StdAddress) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeInt(src.workchain, 8);
        b_0.storeUint(src.address, 256);
    };
}

export function loadStdAddress(slice: Slice) {
    const sc_0 = slice;
    const _workchain = sc_0.loadIntBig(8);
    const _address = sc_0.loadUintBig(256);
    return { $$type: 'StdAddress' as const, workchain: _workchain, address: _address };
}

export function loadTupleStdAddress(source: TupleReader) {
    const _workchain = source.readBigNumber();
    const _address = source.readBigNumber();
    return { $$type: 'StdAddress' as const, workchain: _workchain, address: _address };
}

export function loadGetterTupleStdAddress(source: TupleReader) {
    const _workchain = source.readBigNumber();
    const _address = source.readBigNumber();
    return { $$type: 'StdAddress' as const, workchain: _workchain, address: _address };
}

export function storeTupleStdAddress(source: StdAddress) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.workchain);
    builder.writeNumber(source.address);
    return builder.build();
}

export function dictValueParserStdAddress(): DictionaryValue<StdAddress> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeStdAddress(src)).endCell());
        },
        parse: (src) => {
            return loadStdAddress(src.loadRef().beginParse());
        }
    }
}

export type VarAddress = {
    $$type: 'VarAddress';
    workchain: bigint;
    address: Slice;
}

export function storeVarAddress(src: VarAddress) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeInt(src.workchain, 32);
        b_0.storeRef(src.address.asCell());
    };
}

export function loadVarAddress(slice: Slice) {
    const sc_0 = slice;
    const _workchain = sc_0.loadIntBig(32);
    const _address = sc_0.loadRef().asSlice();
    return { $$type: 'VarAddress' as const, workchain: _workchain, address: _address };
}

export function loadTupleVarAddress(source: TupleReader) {
    const _workchain = source.readBigNumber();
    const _address = source.readCell().asSlice();
    return { $$type: 'VarAddress' as const, workchain: _workchain, address: _address };
}

export function loadGetterTupleVarAddress(source: TupleReader) {
    const _workchain = source.readBigNumber();
    const _address = source.readCell().asSlice();
    return { $$type: 'VarAddress' as const, workchain: _workchain, address: _address };
}

export function storeTupleVarAddress(source: VarAddress) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.workchain);
    builder.writeSlice(source.address.asCell());
    return builder.build();
}

export function dictValueParserVarAddress(): DictionaryValue<VarAddress> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeVarAddress(src)).endCell());
        },
        parse: (src) => {
            return loadVarAddress(src.loadRef().beginParse());
        }
    }
}

export type BasechainAddress = {
    $$type: 'BasechainAddress';
    hash: bigint | null;
}

export function storeBasechainAddress(src: BasechainAddress) {
    return (builder: Builder) => {
        const b_0 = builder;
        if (src.hash !== null && src.hash !== undefined) { b_0.storeBit(true).storeInt(src.hash, 257); } else { b_0.storeBit(false); }
    };
}

export function loadBasechainAddress(slice: Slice) {
    const sc_0 = slice;
    const _hash = sc_0.loadBit() ? sc_0.loadIntBig(257) : null;
    return { $$type: 'BasechainAddress' as const, hash: _hash };
}

export function loadTupleBasechainAddress(source: TupleReader) {
    const _hash = source.readBigNumberOpt();
    return { $$type: 'BasechainAddress' as const, hash: _hash };
}

export function loadGetterTupleBasechainAddress(source: TupleReader) {
    const _hash = source.readBigNumberOpt();
    return { $$type: 'BasechainAddress' as const, hash: _hash };
}

export function storeTupleBasechainAddress(source: BasechainAddress) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.hash);
    return builder.build();
}

export function dictValueParserBasechainAddress(): DictionaryValue<BasechainAddress> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeBasechainAddress(src)).endCell());
        },
        parse: (src) => {
            return loadBasechainAddress(src.loadRef().beginParse());
        }
    }
}

export type Deploy = {
    $$type: 'Deploy';
    queryId: bigint;
}

export function storeDeploy(src: Deploy) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeUint(2490013878, 32);
        b_0.storeUint(src.queryId, 64);
    };
}

export function loadDeploy(slice: Slice) {
    const sc_0 = slice;
    if (sc_0.loadUint(32) !== 2490013878) { throw Error('Invalid prefix'); }
    const _queryId = sc_0.loadUintBig(64);
    return { $$type: 'Deploy' as const, queryId: _queryId };
}

export function loadTupleDeploy(source: TupleReader) {
    const _queryId = source.readBigNumber();
    return { $$type: 'Deploy' as const, queryId: _queryId };
}

export function loadGetterTupleDeploy(source: TupleReader) {
    const _queryId = source.readBigNumber();
    return { $$type: 'Deploy' as const, queryId: _queryId };
}

export function storeTupleDeploy(source: Deploy) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.queryId);
    return builder.build();
}

export function dictValueParserDeploy(): DictionaryValue<Deploy> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeDeploy(src)).endCell());
        },
        parse: (src) => {
            return loadDeploy(src.loadRef().beginParse());
        }
    }
}

export type DeployOk = {
    $$type: 'DeployOk';
    queryId: bigint;
}

export function storeDeployOk(src: DeployOk) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeUint(2952335191, 32);
        b_0.storeUint(src.queryId, 64);
    };
}

export function loadDeployOk(slice: Slice) {
    const sc_0 = slice;
    if (sc_0.loadUint(32) !== 2952335191) { throw Error('Invalid prefix'); }
    const _queryId = sc_0.loadUintBig(64);
    return { $$type: 'DeployOk' as const, queryId: _queryId };
}

export function loadTupleDeployOk(source: TupleReader) {
    const _queryId = source.readBigNumber();
    return { $$type: 'DeployOk' as const, queryId: _queryId };
}

export function loadGetterTupleDeployOk(source: TupleReader) {
    const _queryId = source.readBigNumber();
    return { $$type: 'DeployOk' as const, queryId: _queryId };
}

export function storeTupleDeployOk(source: DeployOk) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.queryId);
    return builder.build();
}

export function dictValueParserDeployOk(): DictionaryValue<DeployOk> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeDeployOk(src)).endCell());
        },
        parse: (src) => {
            return loadDeployOk(src.loadRef().beginParse());
        }
    }
}

export type FactoryDeploy = {
    $$type: 'FactoryDeploy';
    queryId: bigint;
    cashback: Address;
}

export function storeFactoryDeploy(src: FactoryDeploy) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeUint(1829761339, 32);
        b_0.storeUint(src.queryId, 64);
        b_0.storeAddress(src.cashback);
    };
}

export function loadFactoryDeploy(slice: Slice) {
    const sc_0 = slice;
    if (sc_0.loadUint(32) !== 1829761339) { throw Error('Invalid prefix'); }
    const _queryId = sc_0.loadUintBig(64);
    const _cashback = sc_0.loadAddress();
    return { $$type: 'FactoryDeploy' as const, queryId: _queryId, cashback: _cashback };
}

export function loadTupleFactoryDeploy(source: TupleReader) {
    const _queryId = source.readBigNumber();
    const _cashback = source.readAddress();
    return { $$type: 'FactoryDeploy' as const, queryId: _queryId, cashback: _cashback };
}

export function loadGetterTupleFactoryDeploy(source: TupleReader) {
    const _queryId = source.readBigNumber();
    const _cashback = source.readAddress();
    return { $$type: 'FactoryDeploy' as const, queryId: _queryId, cashback: _cashback };
}

export function storeTupleFactoryDeploy(source: FactoryDeploy) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.queryId);
    builder.writeAddress(source.cashback);
    return builder.build();
}

export function dictValueParserFactoryDeploy(): DictionaryValue<FactoryDeploy> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeFactoryDeploy(src)).endCell());
        },
        parse: (src) => {
            return loadFactoryDeploy(src.loadRef().beginParse());
        }
    }
}

export type ChangeOwner = {
    $$type: 'ChangeOwner';
    queryId: bigint;
    newOwner: Address;
}

export function storeChangeOwner(src: ChangeOwner) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeUint(2174598809, 32);
        b_0.storeUint(src.queryId, 64);
        b_0.storeAddress(src.newOwner);
    };
}

export function loadChangeOwner(slice: Slice) {
    const sc_0 = slice;
    if (sc_0.loadUint(32) !== 2174598809) { throw Error('Invalid prefix'); }
    const _queryId = sc_0.loadUintBig(64);
    const _newOwner = sc_0.loadAddress();
    return { $$type: 'ChangeOwner' as const, queryId: _queryId, newOwner: _newOwner };
}

export function loadTupleChangeOwner(source: TupleReader) {
    const _queryId = source.readBigNumber();
    const _newOwner = source.readAddress();
    return { $$type: 'ChangeOwner' as const, queryId: _queryId, newOwner: _newOwner };
}

export function loadGetterTupleChangeOwner(source: TupleReader) {
    const _queryId = source.readBigNumber();
    const _newOwner = source.readAddress();
    return { $$type: 'ChangeOwner' as const, queryId: _queryId, newOwner: _newOwner };
}

export function storeTupleChangeOwner(source: ChangeOwner) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.queryId);
    builder.writeAddress(source.newOwner);
    return builder.build();
}

export function dictValueParserChangeOwner(): DictionaryValue<ChangeOwner> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeChangeOwner(src)).endCell());
        },
        parse: (src) => {
            return loadChangeOwner(src.loadRef().beginParse());
        }
    }
}

export type ChangeOwnerOk = {
    $$type: 'ChangeOwnerOk';
    queryId: bigint;
    newOwner: Address;
}

export function storeChangeOwnerOk(src: ChangeOwnerOk) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeUint(846932810, 32);
        b_0.storeUint(src.queryId, 64);
        b_0.storeAddress(src.newOwner);
    };
}

export function loadChangeOwnerOk(slice: Slice) {
    const sc_0 = slice;
    if (sc_0.loadUint(32) !== 846932810) { throw Error('Invalid prefix'); }
    const _queryId = sc_0.loadUintBig(64);
    const _newOwner = sc_0.loadAddress();
    return { $$type: 'ChangeOwnerOk' as const, queryId: _queryId, newOwner: _newOwner };
}

export function loadTupleChangeOwnerOk(source: TupleReader) {
    const _queryId = source.readBigNumber();
    const _newOwner = source.readAddress();
    return { $$type: 'ChangeOwnerOk' as const, queryId: _queryId, newOwner: _newOwner };
}

export function loadGetterTupleChangeOwnerOk(source: TupleReader) {
    const _queryId = source.readBigNumber();
    const _newOwner = source.readAddress();
    return { $$type: 'ChangeOwnerOk' as const, queryId: _queryId, newOwner: _newOwner };
}

export function storeTupleChangeOwnerOk(source: ChangeOwnerOk) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.queryId);
    builder.writeAddress(source.newOwner);
    return builder.build();
}

export function dictValueParserChangeOwnerOk(): DictionaryValue<ChangeOwnerOk> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeChangeOwnerOk(src)).endCell());
        },
        parse: (src) => {
            return loadChangeOwnerOk(src.loadRef().beginParse());
        }
    }
}

export type WithdrawTON = {
    $$type: 'WithdrawTON';
    queryId: bigint;
    amount: bigint;
    to: Address;
}

export function storeWithdrawTON(src: WithdrawTON) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeUint(1179929857, 32);
        b_0.storeUint(src.queryId, 64);
        b_0.storeCoins(src.amount);
        b_0.storeAddress(src.to);
    };
}

export function loadWithdrawTON(slice: Slice) {
    const sc_0 = slice;
    if (sc_0.loadUint(32) !== 1179929857) { throw Error('Invalid prefix'); }
    const _queryId = sc_0.loadUintBig(64);
    const _amount = sc_0.loadCoins();
    const _to = sc_0.loadAddress();
    return { $$type: 'WithdrawTON' as const, queryId: _queryId, amount: _amount, to: _to };
}

export function loadTupleWithdrawTON(source: TupleReader) {
    const _queryId = source.readBigNumber();
    const _amount = source.readBigNumber();
    const _to = source.readAddress();
    return { $$type: 'WithdrawTON' as const, queryId: _queryId, amount: _amount, to: _to };
}

export function loadGetterTupleWithdrawTON(source: TupleReader) {
    const _queryId = source.readBigNumber();
    const _amount = source.readBigNumber();
    const _to = source.readAddress();
    return { $$type: 'WithdrawTON' as const, queryId: _queryId, amount: _amount, to: _to };
}

export function storeTupleWithdrawTON(source: WithdrawTON) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.queryId);
    builder.writeNumber(source.amount);
    builder.writeAddress(source.to);
    return builder.build();
}

export function dictValueParserWithdrawTON(): DictionaryValue<WithdrawTON> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeWithdrawTON(src)).endCell());
        },
        parse: (src) => {
            return loadWithdrawTON(src.loadRef().beginParse());
        }
    }
}

export type UpdateFees = {
    $$type: 'UpdateFees';
    feeBps: bigint;
    fixedFee: bigint;
    minWithdraw: bigint;
    maxWithdraw: bigint;
}

export function storeUpdateFees(src: UpdateFees) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeUint(1179929858, 32);
        b_0.storeUint(src.feeBps, 16);
        b_0.storeCoins(src.fixedFee);
        b_0.storeCoins(src.minWithdraw);
        b_0.storeCoins(src.maxWithdraw);
    };
}

export function loadUpdateFees(slice: Slice) {
    const sc_0 = slice;
    if (sc_0.loadUint(32) !== 1179929858) { throw Error('Invalid prefix'); }
    const _feeBps = sc_0.loadUintBig(16);
    const _fixedFee = sc_0.loadCoins();
    const _minWithdraw = sc_0.loadCoins();
    const _maxWithdraw = sc_0.loadCoins();
    return { $$type: 'UpdateFees' as const, feeBps: _feeBps, fixedFee: _fixedFee, minWithdraw: _minWithdraw, maxWithdraw: _maxWithdraw };
}

export function loadTupleUpdateFees(source: TupleReader) {
    const _feeBps = source.readBigNumber();
    const _fixedFee = source.readBigNumber();
    const _minWithdraw = source.readBigNumber();
    const _maxWithdraw = source.readBigNumber();
    return { $$type: 'UpdateFees' as const, feeBps: _feeBps, fixedFee: _fixedFee, minWithdraw: _minWithdraw, maxWithdraw: _maxWithdraw };
}

export function loadGetterTupleUpdateFees(source: TupleReader) {
    const _feeBps = source.readBigNumber();
    const _fixedFee = source.readBigNumber();
    const _minWithdraw = source.readBigNumber();
    const _maxWithdraw = source.readBigNumber();
    return { $$type: 'UpdateFees' as const, feeBps: _feeBps, fixedFee: _fixedFee, minWithdraw: _minWithdraw, maxWithdraw: _maxWithdraw };
}

export function storeTupleUpdateFees(source: UpdateFees) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.feeBps);
    builder.writeNumber(source.fixedFee);
    builder.writeNumber(source.minWithdraw);
    builder.writeNumber(source.maxWithdraw);
    return builder.build();
}

export function dictValueParserUpdateFees(): DictionaryValue<UpdateFees> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeUpdateFees(src)).endCell());
        },
        parse: (src) => {
            return loadUpdateFees(src.loadRef().beginParse());
        }
    }
}

export type Pause = {
    $$type: 'Pause';
}

export function storePause(src: Pause) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeUint(1179929859, 32);
    };
}

export function loadPause(slice: Slice) {
    const sc_0 = slice;
    if (sc_0.loadUint(32) !== 1179929859) { throw Error('Invalid prefix'); }
    return { $$type: 'Pause' as const };
}

export function loadTuplePause(source: TupleReader) {
    return { $$type: 'Pause' as const };
}

export function loadGetterTuplePause(source: TupleReader) {
    return { $$type: 'Pause' as const };
}

export function storeTuplePause(source: Pause) {
    const builder = new TupleBuilder();
    return builder.build();
}

export function dictValueParserPause(): DictionaryValue<Pause> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storePause(src)).endCell());
        },
        parse: (src) => {
            return loadPause(src.loadRef().beginParse());
        }
    }
}

export type Unpause = {
    $$type: 'Unpause';
}

export function storeUnpause(src: Unpause) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeUint(1179929860, 32);
    };
}

export function loadUnpause(slice: Slice) {
    const sc_0 = slice;
    if (sc_0.loadUint(32) !== 1179929860) { throw Error('Invalid prefix'); }
    return { $$type: 'Unpause' as const };
}

export function loadTupleUnpause(source: TupleReader) {
    return { $$type: 'Unpause' as const };
}

export function loadGetterTupleUnpause(source: TupleReader) {
    return { $$type: 'Unpause' as const };
}

export function storeTupleUnpause(source: Unpause) {
    const builder = new TupleBuilder();
    return builder.build();
}

export function dictValueParserUnpause(): DictionaryValue<Unpause> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeUnpause(src)).endCell());
        },
        parse: (src) => {
            return loadUnpause(src.loadRef().beginParse());
        }
    }
}

export type EmergencyWithdrawTON = {
    $$type: 'EmergencyWithdrawTON';
    amount: bigint;
    to: Address;
}

export function storeEmergencyWithdrawTON(src: EmergencyWithdrawTON) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeUint(1179929861, 32);
        b_0.storeCoins(src.amount);
        b_0.storeAddress(src.to);
    };
}

export function loadEmergencyWithdrawTON(slice: Slice) {
    const sc_0 = slice;
    if (sc_0.loadUint(32) !== 1179929861) { throw Error('Invalid prefix'); }
    const _amount = sc_0.loadCoins();
    const _to = sc_0.loadAddress();
    return { $$type: 'EmergencyWithdrawTON' as const, amount: _amount, to: _to };
}

export function loadTupleEmergencyWithdrawTON(source: TupleReader) {
    const _amount = source.readBigNumber();
    const _to = source.readAddress();
    return { $$type: 'EmergencyWithdrawTON' as const, amount: _amount, to: _to };
}

export function loadGetterTupleEmergencyWithdrawTON(source: TupleReader) {
    const _amount = source.readBigNumber();
    const _to = source.readAddress();
    return { $$type: 'EmergencyWithdrawTON' as const, amount: _amount, to: _to };
}

export function storeTupleEmergencyWithdrawTON(source: EmergencyWithdrawTON) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.amount);
    builder.writeAddress(source.to);
    return builder.build();
}

export function dictValueParserEmergencyWithdrawTON(): DictionaryValue<EmergencyWithdrawTON> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeEmergencyWithdrawTON(src)).endCell());
        },
        parse: (src) => {
            return loadEmergencyWithdrawTON(src.loadRef().beginParse());
        }
    }
}

export type UpdateFeeWallet = {
    $$type: 'UpdateFeeWallet';
    feeWallet: Address;
}

export function storeUpdateFeeWallet(src: UpdateFeeWallet) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeUint(1179929862, 32);
        b_0.storeAddress(src.feeWallet);
    };
}

export function loadUpdateFeeWallet(slice: Slice) {
    const sc_0 = slice;
    if (sc_0.loadUint(32) !== 1179929862) { throw Error('Invalid prefix'); }
    const _feeWallet = sc_0.loadAddress();
    return { $$type: 'UpdateFeeWallet' as const, feeWallet: _feeWallet };
}

export function loadTupleUpdateFeeWallet(source: TupleReader) {
    const _feeWallet = source.readAddress();
    return { $$type: 'UpdateFeeWallet' as const, feeWallet: _feeWallet };
}

export function loadGetterTupleUpdateFeeWallet(source: TupleReader) {
    const _feeWallet = source.readAddress();
    return { $$type: 'UpdateFeeWallet' as const, feeWallet: _feeWallet };
}

export function storeTupleUpdateFeeWallet(source: UpdateFeeWallet) {
    const builder = new TupleBuilder();
    builder.writeAddress(source.feeWallet);
    return builder.build();
}

export function dictValueParserUpdateFeeWallet(): DictionaryValue<UpdateFeeWallet> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeUpdateFeeWallet(src)).endCell());
        },
        parse: (src) => {
            return loadUpdateFeeWallet(src.loadRef().beginParse());
        }
    }
}

export type FutmundiTonTreasury$Data = {
    $$type: 'FutmundiTonTreasury$Data';
    owner: Address;
    feeWallet: Address;
    paused: boolean;
    feeBps: bigint;
    fixedFee: bigint;
    minWithdraw: bigint;
    maxWithdraw: bigint;
}

export function storeFutmundiTonTreasury$Data(src: FutmundiTonTreasury$Data) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeAddress(src.owner);
        b_0.storeAddress(src.feeWallet);
        b_0.storeBit(src.paused);
        b_0.storeUint(src.feeBps, 16);
        b_0.storeCoins(src.fixedFee);
        b_0.storeCoins(src.minWithdraw);
        b_0.storeCoins(src.maxWithdraw);
    };
}

export function loadFutmundiTonTreasury$Data(slice: Slice) {
    const sc_0 = slice;
    const _owner = sc_0.loadAddress();
    const _feeWallet = sc_0.loadAddress();
    const _paused = sc_0.loadBit();
    const _feeBps = sc_0.loadUintBig(16);
    const _fixedFee = sc_0.loadCoins();
    const _minWithdraw = sc_0.loadCoins();
    const _maxWithdraw = sc_0.loadCoins();
    return { $$type: 'FutmundiTonTreasury$Data' as const, owner: _owner, feeWallet: _feeWallet, paused: _paused, feeBps: _feeBps, fixedFee: _fixedFee, minWithdraw: _minWithdraw, maxWithdraw: _maxWithdraw };
}

export function loadTupleFutmundiTonTreasury$Data(source: TupleReader) {
    const _owner = source.readAddress();
    const _feeWallet = source.readAddress();
    const _paused = source.readBoolean();
    const _feeBps = source.readBigNumber();
    const _fixedFee = source.readBigNumber();
    const _minWithdraw = source.readBigNumber();
    const _maxWithdraw = source.readBigNumber();
    return { $$type: 'FutmundiTonTreasury$Data' as const, owner: _owner, feeWallet: _feeWallet, paused: _paused, feeBps: _feeBps, fixedFee: _fixedFee, minWithdraw: _minWithdraw, maxWithdraw: _maxWithdraw };
}

export function loadGetterTupleFutmundiTonTreasury$Data(source: TupleReader) {
    const _owner = source.readAddress();
    const _feeWallet = source.readAddress();
    const _paused = source.readBoolean();
    const _feeBps = source.readBigNumber();
    const _fixedFee = source.readBigNumber();
    const _minWithdraw = source.readBigNumber();
    const _maxWithdraw = source.readBigNumber();
    return { $$type: 'FutmundiTonTreasury$Data' as const, owner: _owner, feeWallet: _feeWallet, paused: _paused, feeBps: _feeBps, fixedFee: _fixedFee, minWithdraw: _minWithdraw, maxWithdraw: _maxWithdraw };
}

export function storeTupleFutmundiTonTreasury$Data(source: FutmundiTonTreasury$Data) {
    const builder = new TupleBuilder();
    builder.writeAddress(source.owner);
    builder.writeAddress(source.feeWallet);
    builder.writeBoolean(source.paused);
    builder.writeNumber(source.feeBps);
    builder.writeNumber(source.fixedFee);
    builder.writeNumber(source.minWithdraw);
    builder.writeNumber(source.maxWithdraw);
    return builder.build();
}

export function dictValueParserFutmundiTonTreasury$Data(): DictionaryValue<FutmundiTonTreasury$Data> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeFutmundiTonTreasury$Data(src)).endCell());
        },
        parse: (src) => {
            return loadFutmundiTonTreasury$Data(src.loadRef().beginParse());
        }
    }
}

 type FutmundiTonTreasury_init_args = {
    $$type: 'FutmundiTonTreasury_init_args';
    owner: Address;
    feeWallet: Address;
}

function initFutmundiTonTreasury_init_args(src: FutmundiTonTreasury_init_args) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeAddress(src.owner);
        b_0.storeAddress(src.feeWallet);
    };
}

async function FutmundiTonTreasury_init(owner: Address, feeWallet: Address) {
    const __code = Cell.fromHex('b5ee9c72410216010005b7000114ff00f4a413f4bcf2c80b01020162021102d0d0eda2edfb01d072d721d200d200fa4021103450666f04f86102f862ed44d0d200018e12fa40fa40d200d30ffa00fa00fa0055606c178e1ffa40fa405902d1017081025882103b9aca008210ee6b2800821812a05f2000e208925f08e026d749c21fe30006f90120030c03fe06d31f21821046544d01bae30221821046544d02ba8edf31d30ffa00fa00fa003010685e341037489adb3c5f048200b438248107d0bbf2f48200b91125c2fff2f48200d62526c200f2f4820097185376bef2f446145052c87f01ca0055605067ce14ce12ca00cb0f01fa0201fa0201fa02c9ed54db31e021821046544d03ba040a0703f431d33f31fa00fa40305078db3c8152f525b3f2f48200a8795382bef2f4820095c25381bbf2f45373a8812710a90423a081691a5391bcf2f418a118716d5a6d6d40037fc8cf8580ca00cf8440ce01fa028069cf40025c6e016eb0935bcf819d58cf8680cf8480f400f400cf81e2f400c901fb0020c200e30055140a05060078716d255443305a6d6d40037fc8cf8580ca00cf8440ce01fa028069cf40025c6e016eb0935bcf819d58cf8680cf8480f400f400cf81e2f400c901fb00003ec87f01ca0055605067ce14ce12ca00cb0f01fa0201fa0201fa02c9ed54db3104e08ea85b10465513db3c7f35c87f01ca0055605067ce14ce12ca00cb0f01fa0201fa0201fa02c9ed54db31e021821046544d04ba8ea85b10465513db3c7035c87f01ca0055605067ce14ce12ca00cb0f01fa0201fa0201fa02c9ed54db31e021821046544d06bae30221821046544d05ba0a0a0809016431fa40301056104510344137db3c3510565503c87f01ca0055605067ce14ce12ca00cb0f01fa0201fa0201fa02c9ed54db310a02f88eee31fa00fa40305078db3c82009f6f28c200f2f45087716d5a6d6d40037fc8cf8580ca00cf8440ce01fa028069cf40025c6e016eb0935bcf819d58cf8680cf8480f400f400cf81e2f400c901fb005514c87f01ca0055605067ce14ce12ca00cb0f01fa0201fa0201fa02c9ed54db31e0018210946a98b6bae302060a0b0010f84227c705f2e08400b6d33f30c8018210aff90f5758cb1fcb3fc91057104610354430f84270705003804201503304c8cf8580ca00cf8440ce01fa02806acf40f400c901fb00c87f01ca0055605067ce14ce12ca00cb0f01fa0201fa0201fa02c9ed54db3102fa82f0ea3e96c7b594e707a4b34f455c6233f4344123525688190a761452b0ad3b7cbfba8e3030815b0af8416f24135f03c200f2f410465513c87f01ca0055605067ce14ce12ca00cb0f01fa0201fa0201fa02c9ed54e02082f0fac1310ee85a533149654bd4ff87fea1d66ccc31677419258f6593b8c691e3f0bae302200d0e006030815b0af8416f24135f03c200f2f410465513c87f01ca0055605067ce14ce12ca00cb0f01fa0201fa0201fa02c9ed5402fa82f095925b5c85e46ec474ffe6bf5b3d185d76fd55ce2398ef4a8fb31ad6373e1258ba8e3030815b0af8416f24135f03c200f2f410465513c87f01ca0055605067ce14ce12ca00cb0f01fa0201fa0201fa02c9ed54e082f091cc3c51d91d613a15a37022955e4094cd88c7951001cb87fbe235bf684d9fdabae3025f070f10005e815b0af8416f24135f03c200f2f410465513c87f01ca0055605067ce14ce12ca00cb0f01fa0201fa0201fa02c9ed540006f2c08202012012140185be28ef6a268690000c7097d207d2069006987fd007d007d002ab0360bc70ffd207d202c816880b840812c41081dcd6500410877359400410c09502f9000716d9e3638c130002260185bc936f6a268690000c7097d207d2069006987fd007d007d002ab0360bc70ffd207d202c816880b840812c41081dcd6500410877359400410c09502f9000716d9e3638c15008a8d109195551355539112481513d388151c99585cdd5c9e481d8c4e880c481513d3880f480d0c0819d95b5ccec81dda5d1a191c985dc8199959480d89480ac80c481513d3a0c79a8e9e');
    const builder = beginCell();
    builder.storeUint(0, 1);
    initFutmundiTonTreasury_init_args({ $$type: 'FutmundiTonTreasury_init_args', owner, feeWallet })(builder);
    const __data = builder.endCell();
    return { code: __code, data: __data };
}

export const FutmundiTonTreasury_errors = {
    2: { message: "Stack underflow" },
    3: { message: "Stack overflow" },
    4: { message: "Integer overflow" },
    5: { message: "Integer out of expected range" },
    6: { message: "Invalid opcode" },
    7: { message: "Type check error" },
    8: { message: "Cell overflow" },
    9: { message: "Cell underflow" },
    10: { message: "Dictionary error" },
    11: { message: "'Unknown' error" },
    12: { message: "Fatal error" },
    13: { message: "Out of gas error" },
    14: { message: "Virtualization error" },
    32: { message: "Action list is invalid" },
    33: { message: "Action list is too long" },
    34: { message: "Action is invalid or not supported" },
    35: { message: "Invalid source address in outbound message" },
    36: { message: "Invalid destination address in outbound message" },
    37: { message: "Not enough Toncoin" },
    38: { message: "Not enough extra currencies" },
    39: { message: "Outbound message does not fit into a cell after rewriting" },
    40: { message: "Cannot process a message" },
    41: { message: "Library reference is null" },
    42: { message: "Library change action error" },
    43: { message: "Exceeded maximum number of cells in the library or the maximum depth of the Merkle tree" },
    50: { message: "Account state size exceeded limits" },
    128: { message: "Null reference exception" },
    129: { message: "Invalid serialization prefix" },
    130: { message: "Invalid incoming message" },
    131: { message: "Constraints error" },
    132: { message: "Access denied" },
    133: { message: "Contract stopped" },
    134: { message: "Invalid argument" },
    135: { message: "Code of a contract was not found" },
    136: { message: "Invalid standard address" },
    138: { message: "Not a basechain address" },
    21237: { message: "Treasury paused" },
    23306: { message: "No TON sent" },
    26906: { message: "Fee exceeds amount" },
    38338: { message: "Max withdraw" },
    38680: { message: "Bad max" },
    40815: { message: "Bad amount" },
    43129: { message: "Min withdraw" },
    46136: { message: "Fee too high" },
    47377: { message: "Bad fixed fee" },
    54821: { message: "Bad min" },
} as const

export const FutmundiTonTreasury_errors_backward = {
    "Stack underflow": 2,
    "Stack overflow": 3,
    "Integer overflow": 4,
    "Integer out of expected range": 5,
    "Invalid opcode": 6,
    "Type check error": 7,
    "Cell overflow": 8,
    "Cell underflow": 9,
    "Dictionary error": 10,
    "'Unknown' error": 11,
    "Fatal error": 12,
    "Out of gas error": 13,
    "Virtualization error": 14,
    "Action list is invalid": 32,
    "Action list is too long": 33,
    "Action is invalid or not supported": 34,
    "Invalid source address in outbound message": 35,
    "Invalid destination address in outbound message": 36,
    "Not enough Toncoin": 37,
    "Not enough extra currencies": 38,
    "Outbound message does not fit into a cell after rewriting": 39,
    "Cannot process a message": 40,
    "Library reference is null": 41,
    "Library change action error": 42,
    "Exceeded maximum number of cells in the library or the maximum depth of the Merkle tree": 43,
    "Account state size exceeded limits": 50,
    "Null reference exception": 128,
    "Invalid serialization prefix": 129,
    "Invalid incoming message": 130,
    "Constraints error": 131,
    "Access denied": 132,
    "Contract stopped": 133,
    "Invalid argument": 134,
    "Code of a contract was not found": 135,
    "Invalid standard address": 136,
    "Not a basechain address": 138,
    "Treasury paused": 21237,
    "No TON sent": 23306,
    "Fee exceeds amount": 26906,
    "Max withdraw": 38338,
    "Bad max": 38680,
    "Bad amount": 40815,
    "Min withdraw": 43129,
    "Fee too high": 46136,
    "Bad fixed fee": 47377,
    "Bad min": 54821,
} as const

const FutmundiTonTreasury_types: ABIType[] = [
    {"name":"DataSize","header":null,"fields":[{"name":"cells","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"bits","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"refs","type":{"kind":"simple","type":"int","optional":false,"format":257}}]},
    {"name":"SignedBundle","header":null,"fields":[{"name":"signature","type":{"kind":"simple","type":"fixed-bytes","optional":false,"format":64}},{"name":"signedData","type":{"kind":"simple","type":"slice","optional":false,"format":"remainder"}}]},
    {"name":"StateInit","header":null,"fields":[{"name":"code","type":{"kind":"simple","type":"cell","optional":false}},{"name":"data","type":{"kind":"simple","type":"cell","optional":false}}]},
    {"name":"Context","header":null,"fields":[{"name":"bounceable","type":{"kind":"simple","type":"bool","optional":false}},{"name":"sender","type":{"kind":"simple","type":"address","optional":false}},{"name":"value","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"raw","type":{"kind":"simple","type":"slice","optional":false}}]},
    {"name":"SendParameters","header":null,"fields":[{"name":"mode","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"body","type":{"kind":"simple","type":"cell","optional":true}},{"name":"code","type":{"kind":"simple","type":"cell","optional":true}},{"name":"data","type":{"kind":"simple","type":"cell","optional":true}},{"name":"value","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"to","type":{"kind":"simple","type":"address","optional":false}},{"name":"bounce","type":{"kind":"simple","type":"bool","optional":false}}]},
    {"name":"MessageParameters","header":null,"fields":[{"name":"mode","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"body","type":{"kind":"simple","type":"cell","optional":true}},{"name":"value","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"to","type":{"kind":"simple","type":"address","optional":false}},{"name":"bounce","type":{"kind":"simple","type":"bool","optional":false}}]},
    {"name":"DeployParameters","header":null,"fields":[{"name":"mode","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"body","type":{"kind":"simple","type":"cell","optional":true}},{"name":"value","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"bounce","type":{"kind":"simple","type":"bool","optional":false}},{"name":"init","type":{"kind":"simple","type":"StateInit","optional":false}}]},
    {"name":"StdAddress","header":null,"fields":[{"name":"workchain","type":{"kind":"simple","type":"int","optional":false,"format":8}},{"name":"address","type":{"kind":"simple","type":"uint","optional":false,"format":256}}]},
    {"name":"VarAddress","header":null,"fields":[{"name":"workchain","type":{"kind":"simple","type":"int","optional":false,"format":32}},{"name":"address","type":{"kind":"simple","type":"slice","optional":false}}]},
    {"name":"BasechainAddress","header":null,"fields":[{"name":"hash","type":{"kind":"simple","type":"int","optional":true,"format":257}}]},
    {"name":"Deploy","header":2490013878,"fields":[{"name":"queryId","type":{"kind":"simple","type":"uint","optional":false,"format":64}}]},
    {"name":"DeployOk","header":2952335191,"fields":[{"name":"queryId","type":{"kind":"simple","type":"uint","optional":false,"format":64}}]},
    {"name":"FactoryDeploy","header":1829761339,"fields":[{"name":"queryId","type":{"kind":"simple","type":"uint","optional":false,"format":64}},{"name":"cashback","type":{"kind":"simple","type":"address","optional":false}}]},
    {"name":"ChangeOwner","header":2174598809,"fields":[{"name":"queryId","type":{"kind":"simple","type":"uint","optional":false,"format":64}},{"name":"newOwner","type":{"kind":"simple","type":"address","optional":false}}]},
    {"name":"ChangeOwnerOk","header":846932810,"fields":[{"name":"queryId","type":{"kind":"simple","type":"uint","optional":false,"format":64}},{"name":"newOwner","type":{"kind":"simple","type":"address","optional":false}}]},
    {"name":"WithdrawTON","header":1179929857,"fields":[{"name":"queryId","type":{"kind":"simple","type":"uint","optional":false,"format":64}},{"name":"amount","type":{"kind":"simple","type":"uint","optional":false,"format":"coins"}},{"name":"to","type":{"kind":"simple","type":"address","optional":false}}]},
    {"name":"UpdateFees","header":1179929858,"fields":[{"name":"feeBps","type":{"kind":"simple","type":"uint","optional":false,"format":16}},{"name":"fixedFee","type":{"kind":"simple","type":"uint","optional":false,"format":"coins"}},{"name":"minWithdraw","type":{"kind":"simple","type":"uint","optional":false,"format":"coins"}},{"name":"maxWithdraw","type":{"kind":"simple","type":"uint","optional":false,"format":"coins"}}]},
    {"name":"Pause","header":1179929859,"fields":[]},
    {"name":"Unpause","header":1179929860,"fields":[]},
    {"name":"EmergencyWithdrawTON","header":1179929861,"fields":[{"name":"amount","type":{"kind":"simple","type":"uint","optional":false,"format":"coins"}},{"name":"to","type":{"kind":"simple","type":"address","optional":false}}]},
    {"name":"UpdateFeeWallet","header":1179929862,"fields":[{"name":"feeWallet","type":{"kind":"simple","type":"address","optional":false}}]},
    {"name":"FutmundiTonTreasury$Data","header":null,"fields":[{"name":"owner","type":{"kind":"simple","type":"address","optional":false}},{"name":"feeWallet","type":{"kind":"simple","type":"address","optional":false}},{"name":"paused","type":{"kind":"simple","type":"bool","optional":false}},{"name":"feeBps","type":{"kind":"simple","type":"uint","optional":false,"format":16}},{"name":"fixedFee","type":{"kind":"simple","type":"uint","optional":false,"format":"coins"}},{"name":"minWithdraw","type":{"kind":"simple","type":"uint","optional":false,"format":"coins"}},{"name":"maxWithdraw","type":{"kind":"simple","type":"uint","optional":false,"format":"coins"}}]},
]

const FutmundiTonTreasury_opcodes = {
    "Deploy": 2490013878,
    "DeployOk": 2952335191,
    "FactoryDeploy": 1829761339,
    "ChangeOwner": 2174598809,
    "ChangeOwnerOk": 846932810,
    "WithdrawTON": 1179929857,
    "UpdateFees": 1179929858,
    "Pause": 1179929859,
    "Unpause": 1179929860,
    "EmergencyWithdrawTON": 1179929861,
    "UpdateFeeWallet": 1179929862,
}

const FutmundiTonTreasury_getters: ABIGetter[] = [
    {"name":"config","methodId":103021,"arguments":[],"returnType":{"kind":"simple","type":"string","optional":false}},
    {"name":"owner","methodId":83229,"arguments":[],"returnType":{"kind":"simple","type":"address","optional":false}},
]

export const FutmundiTonTreasury_getterMapping: { [key: string]: string } = {
    'config': 'getConfig',
    'owner': 'getOwner',
}

const FutmundiTonTreasury_receivers: ABIReceiver[] = [
    {"receiver":"internal","message":{"kind":"text","text":"Fund"}},
    {"receiver":"internal","message":{"kind":"text","text":"Deposit"}},
    {"receiver":"internal","message":{"kind":"text","text":"Bet"}},
    {"receiver":"internal","message":{"kind":"text","text":"Tournament"}},
    {"receiver":"internal","message":{"kind":"typed","type":"WithdrawTON"}},
    {"receiver":"internal","message":{"kind":"typed","type":"UpdateFees"}},
    {"receiver":"internal","message":{"kind":"typed","type":"Pause"}},
    {"receiver":"internal","message":{"kind":"typed","type":"Unpause"}},
    {"receiver":"internal","message":{"kind":"typed","type":"UpdateFeeWallet"}},
    {"receiver":"internal","message":{"kind":"typed","type":"EmergencyWithdrawTON"}},
    {"receiver":"internal","message":{"kind":"typed","type":"Deploy"}},
]


export class FutmundiTonTreasury implements Contract {
    
    public static readonly storageReserve = 0n;
    public static readonly errors = FutmundiTonTreasury_errors_backward;
    public static readonly opcodes = FutmundiTonTreasury_opcodes;
    
    static async init(owner: Address, feeWallet: Address) {
        return await FutmundiTonTreasury_init(owner, feeWallet);
    }
    
    static async fromInit(owner: Address, feeWallet: Address) {
        const __gen_init = await FutmundiTonTreasury_init(owner, feeWallet);
        const address = contractAddress(0, __gen_init);
        return new FutmundiTonTreasury(address, __gen_init);
    }
    
    static fromAddress(address: Address) {
        return new FutmundiTonTreasury(address);
    }
    
    readonly address: Address; 
    readonly init?: { code: Cell, data: Cell };
    readonly abi: ContractABI = {
        types:  FutmundiTonTreasury_types,
        getters: FutmundiTonTreasury_getters,
        receivers: FutmundiTonTreasury_receivers,
        errors: FutmundiTonTreasury_errors,
    };
    
    constructor(address: Address, init?: { code: Cell, data: Cell }) {
        this.address = address;
        this.init = init;
    }
    
    async send(provider: ContractProvider, via: Sender, args: { value: bigint, bounce?: boolean| null | undefined }, message: "Fund" | "Deposit" | "Bet" | "Tournament" | WithdrawTON | UpdateFees | Pause | Unpause | UpdateFeeWallet | EmergencyWithdrawTON | Deploy) {
        
        let body: Cell | null = null;
        if (message === "Fund") {
            body = beginCell().storeUint(0, 32).storeStringTail(message).endCell();
        }
        if (message === "Deposit") {
            body = beginCell().storeUint(0, 32).storeStringTail(message).endCell();
        }
        if (message === "Bet") {
            body = beginCell().storeUint(0, 32).storeStringTail(message).endCell();
        }
        if (message === "Tournament") {
            body = beginCell().storeUint(0, 32).storeStringTail(message).endCell();
        }
        if (message && typeof message === 'object' && !(message instanceof Slice) && message.$$type === 'WithdrawTON') {
            body = beginCell().store(storeWithdrawTON(message)).endCell();
        }
        if (message && typeof message === 'object' && !(message instanceof Slice) && message.$$type === 'UpdateFees') {
            body = beginCell().store(storeUpdateFees(message)).endCell();
        }
        if (message && typeof message === 'object' && !(message instanceof Slice) && message.$$type === 'Pause') {
            body = beginCell().store(storePause(message)).endCell();
        }
        if (message && typeof message === 'object' && !(message instanceof Slice) && message.$$type === 'Unpause') {
            body = beginCell().store(storeUnpause(message)).endCell();
        }
        if (message && typeof message === 'object' && !(message instanceof Slice) && message.$$type === 'UpdateFeeWallet') {
            body = beginCell().store(storeUpdateFeeWallet(message)).endCell();
        }
        if (message && typeof message === 'object' && !(message instanceof Slice) && message.$$type === 'EmergencyWithdrawTON') {
            body = beginCell().store(storeEmergencyWithdrawTON(message)).endCell();
        }
        if (message && typeof message === 'object' && !(message instanceof Slice) && message.$$type === 'Deploy') {
            body = beginCell().store(storeDeploy(message)).endCell();
        }
        if (body === null) { throw new Error('Invalid message type'); }
        
        await provider.internal(via, { ...args, body: body });
        
    }
    
    async getConfig(provider: ContractProvider) {
        const builder = new TupleBuilder();
        const source = (await provider.get('config', builder.build())).stack;
        const result = source.readString();
        return result;
    }
    
    async getOwner(provider: ContractProvider) {
        const builder = new TupleBuilder();
        const source = (await provider.get('owner', builder.build())).stack;
        const result = source.readAddress();
        return result;
    }
    
}