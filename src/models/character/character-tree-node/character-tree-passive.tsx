import {
    StaticReferenceHandle,
    StaticReferenceIdentifier,
    StaticallyReferenceable,
} from '@jorgenswiderski/tomekeeper-shared/dist/models/static-reference/types';
import { StaticReference } from '@jorgenswiderski/tomekeeper-shared/dist/models/static-reference/static-reference';
import {
    GrantableEffectType,
    IPassive,
} from '@jorgenswiderski/tomekeeper-shared/dist/types/grantable-effect';
import { PassiveStubConstructor } from '@jorgenswiderski/tomekeeper-shared/dist/models/static-reference/stubs';
import { WeaveApi } from '../../../api/weave/weave';
import { CharacterTreeEffect } from './character-tree';

let ref: {
    pool: Map<number, CharacterTreePassive>;
    create: (id: number) => StaticReferenceHandle;
};

export class CharacterTreePassive
    extends CharacterTreeEffect
    implements IPassive, StaticallyReferenceable
{
    id: number;
    type: GrantableEffectType.PASSIVE = GrantableEffectType.PASSIVE;

    constructor(passive: IPassive) {
        super(passive);

        this.id = passive.id;
    }

    toJSON(): StaticReferenceHandle {
        return ref.create(this.id);
    }

    static async fromId(id: number): Promise<CharacterTreePassive> {
        const passive = await WeaveApi.passives.getById(id);

        return new CharacterTreePassive(passive);
    }
}

// Assure that the constructor signature matches that defined by the class stub
// See stubs.ts for more info
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const typeCheck: PassiveStubConstructor = CharacterTreePassive;

ref = StaticReference.registerClass(
    CharacterTreePassive,
    StaticReferenceIdentifier.Passive,
);

export const initCharacterTreePassiveRef = () => ref;
