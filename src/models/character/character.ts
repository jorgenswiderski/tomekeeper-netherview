// character.ts
import {
    ICharacterOption,
    CharacterPlannerStep,
    ICharacterChoice,
} from '@jorgenswiderski/tomekeeper-shared/dist/types/character-feature-customization-option';
import {
    GrantableEffect,
    PassiveType,
    GrantableEffectType,
    Proficiency,
    IActionEffect,
    IPassive,
} from '@jorgenswiderski/tomekeeper-shared/dist/types/grantable-effect';
import { ISpell } from '@jorgenswiderski/tomekeeper-shared/dist/types/action';
import {
    EquipmentItemType,
    EquipmentSlot,
    IEquipmentItem,
    IWeaponItem,
    WeaponHandedness,
} from '@jorgenswiderski/tomekeeper-shared/dist/types/equipment-item';
import assert from 'assert';
import {
    AbilityScores,
    CharacterClassInfo,
    CharacterClassOption,
    ICharacter,
} from './types';
import { PendingDecision } from './pending-decision/pending-decision';
import {
    CharacterTreeDecision,
    CharacterTreeEffect,
    CharacterTreeNode,
    CharacterTreeRoot,
} from './character-tree-node/character-tree';
import {
    CharacterTreeNodeType,
    ICharacterTreeDecision,
    ICharacterTreeNode,
} from './character-tree-node/types';
import { characterDecisionInfo, IPendingDecision } from './character-states';
import { CharacterClassProgressionLevel } from '../../api/weave/types';
import {
    CharacterEquipment,
    ICharacterTreeEquipmentItem,
} from '../items/types';
import { CharacterTreeEquipmentItem } from './character-tree-node/character-tree-equipment-item';
import { EquipmentItemFactory } from '../items/equipment-item-factory';
import { CharacterTreeSpell } from './character-tree-node/character-tree-spell';
import { TreeCompressor } from '../tree-compressor';
import { WeaponItem } from '../items/weapon-item';
import { error } from '../logger';
import { safeAssert } from '../utils';

export class Character implements ICharacter {
    static MAX_LEVEL = 12;
    static LEVEL_STEPS = [
        CharacterPlannerStep.LEVEL_UP,
        CharacterPlannerStep.SECONDARY_CLASS,
        CharacterPlannerStep.PRIMARY_CLASS,
    ];
    static LEVEL_ROOTS = [
        CharacterPlannerStep.SECONDARY_CLASS,
        CharacterPlannerStep.PRIMARY_CLASS,
    ];

    root: CharacterTreeRoot = new CharacterTreeRoot();

    pendingSteps: CharacterPlannerStep[] = [
        CharacterPlannerStep.SET_RACE,
        CharacterPlannerStep.PRIMARY_CLASS,
        CharacterPlannerStep.SET_BACKGROUND,
        CharacterPlannerStep.SET_ABILITY_SCORES,
    ];
    pendingDecisions: PendingDecision[] = [];

    constructor(
        public baseClassData: CharacterClassOption[],
        public spellData: ISpell[],
    ) {}

    multiclassRoot: ICharacterOption = {
        name: 'Add a class',
        // description: 'Add a level in a new class.',
        type: CharacterPlannerStep.MULTICLASS_PROXY,
    };

    name: string = 'Tav';

    // State management =======================================================

    async queueNextStep(): Promise<Character | null> {
        if (!this.pendingSteps.length) {
            return null;
        }

        const step = this.pendingSteps.shift()!;
        const info = characterDecisionInfo[step];

        const choices = info?.getChoices
            ? await info.getChoices(this)
            : [{ type: step, options: await info.getOptions!(this) }];

        choices.forEach((choice) =>
            this.pendingDecisions.push(new PendingDecision(this.root, choice)),
        );

        return this.clone();
    }

    getNextDecision(): PendingDecision | null {
        return this.pendingDecisions[0] || null;
    }

    unqueueDecision(decision: PendingDecision) {
        const index = this.pendingDecisions.findIndex(
            (dec) => dec === decision,
        );

        if (index > -1) {
            this.pendingDecisions.splice(index, 1);
        } else {
            throw new Error(
                'Attempted to complete a pending decision that was not in the queue.',
            );
        }
    }

    makeDecision(
        pending: IPendingDecision,
        optionOrOptions: ICharacterOption | ICharacterOption[],
    ): Character {
        const { type, id: choiceId } = pending;
        let { parent } = pending;
        this.unqueueDecision(pending as PendingDecision);

        const options: ICharacterOption[] = Array.isArray(optionOrOptions)
            ? optionOrOptions
            : [optionOrOptions];

        options.forEach((option) => {
            if (option.type === CharacterPlannerStep.REMOVE_LEVEL) {
                this.removeLevel(option);

                return;
            }

            if (option.type === CharacterPlannerStep.REVISE_LEVEL) {
                this.reviseLevel(option);

                return;
            }

            if (option.type === CharacterPlannerStep.CHANGE_PRIMARY_CLASS) {
                this.changePrimaryClass(option.name);

                return;
            }

            if (!parent && Character.LEVEL_STEPS.includes(type)) {
                parent = this.findClassParent(option);
            }

            if (!parent) {
                throw new Error('Could not find parent when making decision');
            }

            if (this.root.findNode((node) => node === parent) === null) {
                throw new Error('Parent exists, but is not found in tree');
            }

            const isProxyChoice =
                option.type === CharacterPlannerStep.MULTICLASS_PROXY;

            if (isProxyChoice) {
                this.pendingDecisions.unshift(
                    ...option.choices!.map(
                        (choice) => new PendingDecision(this.root, choice),
                    ),
                );
            } else {
                const decision =
                    option instanceof CharacterTreeDecision
                        ? option
                        : new CharacterTreeDecision(
                              { type, ...option },
                              choiceId,
                          );

                parent.addChild(decision);
                Character.grantEffects(decision);

                this.queueSubchoices(decision, option.choices);
            }
        });

        return this.clone();
    }

    clone(): Character {
        return Object.assign(
            new Character(this.baseClassData, this.spellData),
            this,
        );
    }

    // Deep clone the character for use with Undo state
    async snapshot(): Promise<Character> {
        const char = new Character(this.baseClassData, this.spellData);

        const skipKeys: (keyof this)[] = ['baseClassData', 'spellData'];

        await Promise.all(
            Object.entries(this)
                .filter(([, val]) => val instanceof CharacterTreeNode)
                .map(async ([key, val]) => {
                    const tree = val as CharacterTreeNode;
                    const transformed = await tree.clone();

                    (char as any)[key] = transformed;
                    skipKeys.push(key as any);
                }),
        );

        function buildPaths(
            node: CharacterTreeNode,
            path: string = '',
            map: Map<string, CharacterTreeNode> = new Map(),
        ): Map<string, CharacterTreeNode> {
            map.set(path, node);

            node.children?.forEach((child, index) => {
                buildPaths(child, `${path}.${index}`, map);
            });

            return map;
        }

        Object.entries(this)
            .filter(([key]) => !skipKeys.includes(key as any))
            .forEach(([key, val]): any => {
                if (key === 'pendingDecisions') {
                    const oldPaths = buildPaths(this.root);
                    const newPaths = buildPaths(char.root);

                    const nodeMap = new WeakMap(
                        [...oldPaths.keys()].map((k) => [
                            oldPaths.get(k)!,
                            newPaths.get(k)!,
                        ]),
                    );

                    const decisions = (val as PendingDecision[]).map(
                        ({ parent, type, options, count, forcedOptions }) => {
                            const newParent = parent
                                ? (nodeMap.get(parent) as
                                      | CharacterTreeDecision
                                      | CharacterTreeRoot)
                                : char.root;

                            assert(
                                newParent,
                                `Couldn't find matching node on path`,
                            );

                            return new PendingDecision(
                                newParent,
                                {
                                    type,
                                    options,
                                    count,
                                    forcedOptions,
                                },
                                true,
                            );
                        },
                    );

                    (char as any)[key] = decisions;

                    return;
                }

                try {
                    (char as any)[key] = structuredClone(val);
                } catch (err) {
                    error(
                        `Couldn't structure clone property '${key}'`,
                        key,
                        typeof val,
                        val,
                    );

                    (char as any)[key] = val;
                }
            });

        return char;
    }

    private queueSubchoices(
        parent: CharacterTreeDecision,
        choices?: ICharacterChoice[],
    ) {
        if (!choices) {
            return;
        }

        const pd: PendingDecision[] = [];

        choices.forEach((choice) => {
            const pending = new PendingDecision(parent, choice);

            if (pending.forcedOptions) {
                safeAssert(
                    pending.forcedOptions.length === (choice.count ?? 1),
                    `Number of forced options (${pending.forcedOptions.length}) should equal choice count (${choice.count})`,
                );

                pending.forcedOptions.forEach((option) => {
                    const decision = new CharacterTreeDecision(
                        option,
                        pending.id,
                    );

                    parent.addChild(decision);
                    Character.grantEffects(decision);
                    this.queueSubchoices(decision, option.choices);
                });

                return;
            }

            pd.push(pending);
        });

        this.pendingDecisions.unshift(...pd);
    }

    // For features like subclass features or Deepened Pact, inject a
    // forcedOption property which constrains the feature based on the previous
    // choice
    private static restrictDependentFeature(
        rootDecision: CharacterTreeDecision,
        step: CharacterPlannerStep,
        data: CharacterClassOption[],
    ): CharacterClassOption[] {
        return data.map((cls) => {
            return {
                ...cls,
                progression: cls.progression.map((level) => ({
                    ...level,
                    Features: level.Features.map((feature) => {
                        if (!feature.choices) {
                            return feature;
                        }

                        const targetChoices = feature.choices.filter(
                            (choice) =>
                                choice.type === step &&
                                choice.options.find(
                                    (option) =>
                                        option.name === rootDecision.name,
                                ),
                        );

                        if (targetChoices.length === 0) {
                            return feature;
                        }

                        const otherChoices = feature.choices.filter(
                            (choice) => !targetChoices.includes(choice),
                        );

                        return {
                            ...feature,
                            choices: [
                                ...otherChoices,
                                ...targetChoices.map((choice) => {
                                    const option = choice.options.find(
                                        (opt) => opt.name === rootDecision.name,
                                    );

                                    if (!option) {
                                        throw new Error(
                                            'could not find option when restricing dependent features',
                                        );
                                    }

                                    return {
                                        ...choice,
                                        forcedOptions: [option],
                                    };
                                }),
                            ],
                        };
                    }),
                })),
            };
        });
    }

    private filterFeatChoices(choice: ICharacterChoice): ICharacterChoice {
        assert(choice.type === CharacterPlannerStep.FEAT);

        const feats = this.findAllDecisionsByType(CharacterPlannerStep.FEAT);
        const featNames = feats.map((feat) => feat.name);

        return {
            ...choice,
            options: choice.options.filter(
                (option) =>
                    !featNames.includes(option.name) ||
                    option.name === 'Ability Improvement',
            ),
        };
    }

    private updateClassFeatures(
        data: CharacterClassOption[],
    ): ICharacterOption[] {
        const levelInfo = this.getClassInfo();

        return data.map((cls) => {
            const level =
                levelInfo.find((info) => info.class.name === cls.name)?.levels
                    .length ?? 0;

            if (level >= Character.MAX_LEVEL) {
                return { ...cls };
            }

            const { progression, ...rest } = cls;

            const choices = cls.progression[level].Features.map(
                (feature): ICharacterChoice => {
                    const typedFeature = {
                        type: CharacterPlannerStep.CLASS_FEATURE,
                        ...feature,
                        choices: feature.choices?.map((choice) => {
                            if (choice?.type === CharacterPlannerStep.FEAT) {
                                return this.filterFeatChoices(choice);
                            }

                            return choice;
                        }),
                    };

                    return {
                        type: CharacterPlannerStep.CLASS_FEATURE,
                        options: [typedFeature],
                        forcedOptions: [typedFeature],
                    };
                },
            );

            return {
                ...rest,
                choices,
                level,
            };
        });
    }

    private getClassProgression(className: string, level: number) {
        return this.baseClassData.find((cls) => cls.name === className)!
            .progression[level - 1];
    }

    private updateClassSpellOptions(
        data: ICharacterOption[],
    ): ICharacterOption[] {
        const levelInfo = this.getClassInfo();

        const keys: (keyof CharacterClassProgressionLevel)[] = [
            'Spells Known',
            'Cantrips Known',
        ];

        return data.map((cls) => {
            const level =
                levelInfo.find((info) => info.class.name === cls.name)?.levels
                    .length ?? 0;

            const currentLevelData =
                level > 0 && this.getClassProgression(cls.name, level);

            const nextLevelData = this.getClassProgression(cls.name, level + 1);

            if (level >= Character.MAX_LEVEL) {
                return { ...cls };
            }

            const spellChoices = keys.flatMap((key) => {
                if (!nextLevelData[key]) {
                    return [];
                }

                const step =
                    key === 'Spells Known'
                        ? CharacterPlannerStep.LEARN_SPELLS
                        : CharacterPlannerStep.LEARN_CANTRIPS;

                const netChoices =
                    ((nextLevelData[key] as number) ?? 0) -
                    (currentLevelData ? (currentLevelData[key] as number) : 0);

                if (netChoices === 0) {
                    return [];
                }

                if (!nextLevelData['Spell Slots']) {
                    throw new Error('class does not have spell slots');
                }

                let spells: ISpell[];

                if (step === CharacterPlannerStep.LEARN_SPELLS) {
                    const highestSlot =
                        typeof nextLevelData['Spell Slots'] === 'number'
                            ? nextLevelData['Slot Level']!
                            : nextLevelData['Spell Slots'].findLastIndex(
                                  (spellCount) => spellCount && spellCount > 0,
                              );

                    spells = this.spellData.filter(
                        (spell) =>
                            spell.level > 0 &&
                            spell.level <= highestSlot &&
                            spell.classes.includes(cls.name),
                    );
                } else {
                    spells = this.spellData.filter(
                        (spell) =>
                            spell.classes.includes(cls.name) &&
                            spell.level === 0,
                    );
                }

                // FIXME
                const choiceId = PendingDecision.generateUuid(
                    step,
                    cls.name,
                    CharacterPlannerStep.LEVEL_UP,
                );

                if (spells.length === 0) {
                    error(
                        `Character had no valid candidates to add to the option pool when learning ${
                            step === CharacterPlannerStep.LEARN_CANTRIPS
                                ? 'cantrips'
                                : 'spells'
                        }`,
                    );

                    return [];
                }

                if (spells.length < netChoices) {
                    error(
                        `Warning: Character had fewer valid candidates than choices when learning ${
                            step === CharacterPlannerStep.LEARN_CANTRIPS
                                ? 'cantrips'
                                : 'spells'
                        }`,
                    );

                    return [];
                }

                return [
                    {
                        type: step,
                        count: Math.min(netChoices, spells.length),
                        options: spells.map(
                            (spell) => new CharacterTreeSpell(spell, choiceId),
                        ),
                    },
                ];
            });

            return {
                ...cls,
                choices: [...(cls.choices ?? []), ...spellChoices],
            };
        });
    }

    static dependentFeatures: {
        decision: CharacterPlannerStep;
        dependents: CharacterPlannerStep;
    }[] = [
        {
            decision: CharacterPlannerStep.CHOOSE_SUBCLASS,
            dependents: CharacterPlannerStep.SUBCLASS_FEATURE,
        },
        {
            decision: CharacterPlannerStep.WARLOCK_PACT_BOON,
            dependents: CharacterPlannerStep.WARLOCK_DEEPENED_PACT,
        },
    ];

    protected restrictDependentFeatures(): CharacterClassOption[] {
        let data = this.baseClassData;

        Character.dependentFeatures.forEach(({ decision, dependents }) => {
            const rootDecisions = this.findAllDecisionsByType(decision);

            rootDecisions.forEach((node) => {
                data = Character.restrictDependentFeature(
                    node,
                    dependents,
                    data,
                );
            });
        });

        return data;
    }

    getCurrentClassData(): ICharacterOption[] {
        const data = this.restrictDependentFeatures();
        const options = this.updateClassFeatures(data);

        return this.updateClassSpellOptions(options);
    }

    levelUp(): Character {
        if (!this.canLevel()) {
            return this;
        }

        const classData = this.getCurrentClassData();

        const currentClassNodes = this.findAllDecisionsByType([
            CharacterPlannerStep.PRIMARY_CLASS,
            CharacterPlannerStep.LEVEL_UP,
            CharacterPlannerStep.SECONDARY_CLASS,
        ]) as ICharacterTreeDecision[];

        const isChoosingPrimaryClass = currentClassNodes.every(
            (cls) => cls.type !== CharacterPlannerStep.PRIMARY_CLASS,
        );

        const currentClassNames = currentClassNodes.map(
            (decision) => decision.name,
        );

        const currentClasses = classData.filter((cls) =>
            isChoosingPrimaryClass
                ? !currentClassNames.includes(cls.name)
                : currentClassNames.includes(cls.name),
        );

        const newClasses = isChoosingPrimaryClass
            ? []
            : classData.filter((cls) => !currentClasses.includes(cls));

        const multiclassOption =
            newClasses.length > 0
                ? [
                      {
                          ...this.multiclassRoot,
                          choices: [
                              {
                                  type: CharacterPlannerStep.SECONDARY_CLASS,
                                  options: newClasses,
                              },
                          ],
                      },
                  ]
                : [];

        const decision: PendingDecision = new PendingDecision(null, {
            options: [...currentClasses, ...multiclassOption],
            type: isChoosingPrimaryClass
                ? CharacterPlannerStep.PRIMARY_CLASS
                : CharacterPlannerStep.LEVEL_UP,
        });

        this.pendingDecisions.unshift(decision);

        return this.clone();
    }

    findClassParent(
        choice: ICharacterOption,
    ): CharacterTreeDecision | CharacterTreeRoot {
        return (
            (this.root.findNode((node) => {
                if (node.nodeType !== CharacterTreeNodeType.DECISION) {
                    return false;
                }

                const decision: CharacterTreeDecision =
                    node as CharacterTreeDecision;

                return (
                    decision.name === choice.name &&
                    (typeof decision.children === 'undefined' ||
                        decision.children.every(
                            (child) => child.name !== choice.name,
                        ))
                );
            }) as CharacterTreeDecision | CharacterTreeRoot | null) ?? this.root
        );
    }

    static grantEffects(
        node: CharacterTreeDecision | CharacterTreeEffect,
    ): void {
        if (!node.grants) {
            return;
        }

        node.grants.forEach((effect) => {
            const child = new CharacterTreeEffect(effect);
            node.addChild(child);
            Character.grantEffects(child);
        });

        // eslint-disable-next-line no-param-reassign
        delete node.grants;
    }

    removeLevel(option: ICharacterOption): void {
        const { node: target } = option as ICharacterOption & {
            node: CharacterTreeDecision;
        };

        const parent = this.findNodeParent(target) as CharacterTreeNode;

        if (!target || !parent) {
            throw new Error('failed to remove level');
        }

        parent.removeChild(target);
    }

    manageLevels(): Character {
        this.pendingDecisions.push(
            new PendingDecision(
                null,
                {
                    type: CharacterPlannerStep.MANAGE_LEVELS,
                    options: [],
                },
                true,
            ),
        );

        return this.clone();
    }

    replayNodes?: CharacterTreeDecision;

    reviseLevel(option: ICharacterOption): void {
        const { node: target } = option as ICharacterOption & {
            node: CharacterTreeDecision;
        };

        const parentNode = this.findNodeParent(target);
        const parent = parentNode as ICharacterTreeDecision;

        if (!target || !parent) {
            throw new Error('failed to remove level');
        }

        // Splice the children from the parent node
        const targetIndex = parent.children!.findIndex(
            (node) => node === target,
        );

        parent.children!.splice(targetIndex, 1);

        // Trigger a level up in the removed class
        this.levelUpClass(target.name, target.type);

        // Get the tree of the subsequent levels of the old node
        const subsequentLevels = target.children?.find(
            (node) => node.type === CharacterPlannerStep.LEVEL_UP,
        ) as CharacterTreeDecision;

        if (!subsequentLevels) {
            return;
        }

        assert(
            typeof this.replayNodes === 'undefined',
            'Replay should not already be in progress',
        );

        this.replayNodes = subsequentLevels;
    }

    levelUpClass(className: string, levelUpType?: CharacterPlannerStep): void {
        this.levelUp();
        let levelDecision = this.pendingDecisions[0];

        if (levelUpType === CharacterPlannerStep.SECONDARY_CLASS) {
            // make the multiclass sub-decision
            const multiclassOption = levelDecision.options.find(
                (opt) => opt.type === CharacterPlannerStep.MULTICLASS_PROXY,
            );

            if (!multiclassOption) {
                throw new Error(
                    'could not find proper option when revising level',
                );
            }

            this.makeDecision(levelDecision, multiclassOption);
            levelDecision = this.pendingDecisions[0];
        }

        const classOption = levelDecision.options.find(
            (opt) => opt.name === className,
        )!;

        this.makeDecision(levelDecision, classOption);
    }

    progressReplay(): Character {
        if (!this.replayNodes) {
            return this;
        }

        const levelNode = this.replayNodes;

        assert(
            levelNode.type && Character.LEVEL_STEPS.includes(levelNode.type),
        );

        const classInfo = this.getClassInfo().find(
            (cls) => cls.class.name === levelNode.name,
        )!;

        if (classInfo.levels.length <= (levelNode as any).level) {
            this.levelUpClass(levelNode.name, levelNode.type);
        }

        if (!levelNode.children) {
            return this.clone();
        }

        function flattenDecisions(
            decisions: CharacterTreeDecision[],
        ): CharacterTreeDecision[] {
            const childDecisions = decisions
                .filter((node) => node.children)
                .flatMap((node) => node.children)
                .filter(
                    (node) => node?.nodeType === CharacterTreeNodeType.DECISION,
                ) as CharacterTreeDecision[];

            return [
                ...decisions,
                ...(childDecisions.length > 0
                    ? flattenDecisions(childDecisions)
                    : []),
            ];
        }

        const pastChildren = (
            levelNode.children.filter(
                (child) => child.nodeType === CharacterTreeNodeType.DECISION,
            ) as CharacterTreeDecision[]
        ).filter(
            (node) => !(node.type && Character.LEVEL_STEPS.includes(node.type)),
        );

        const pastDecisions = flattenDecisions(pastChildren);

        function getFastforwardableDecisions(
            pending: PendingDecision[],
            past: CharacterTreeDecision[],
        ): Map<PendingDecision, { name: string }[]> {
            const map = new Map<PendingDecision, { name: string }[]>();

            pending.forEach((decision) => {
                const pastDecision = past.filter(
                    (pDec) => pDec.choiceId === decision.id,
                );

                if (pastDecision.length !== decision.count) {
                    return;
                }

                if (
                    !pastDecision.every((p) =>
                        decision.options.find(
                            (option) => option.name === p.name,
                        ),
                    )
                ) {
                    return;
                }

                if (
                    decision.forcedOptions &&
                    !pastDecision.every((p) =>
                        decision.forcedOptions!.find(
                            (option) => option.name === p.name,
                        ),
                    )
                ) {
                    return;
                }

                map.set(decision, pastDecision);
            });

            return map;
        }

        let fastforwards = getFastforwardableDecisions(
            this.pendingDecisions,
            pastDecisions,
        );

        while (fastforwards.size > 0) {
            [...fastforwards.entries()].forEach(([pending, past]) => {
                const option = past.map(
                    (p) => pending.options.find((opt) => opt.name === p.name)!,
                );

                this.makeDecision(pending, option);
            });

            fastforwards = getFastforwardableDecisions(
                this.pendingDecisions,
                pastDecisions,
            );
        }

        if (this.pendingDecisions.length === 0) {
            this.replayNodes = levelNode.children.find(
                (child) => child.name === levelNode.name,
            ) as CharacterTreeDecision | undefined;

            if (this.replayNodes) {
                return this.progressReplay();
            }
        }

        return this.clone();
    }

    changePrimaryClass(className: string): void {
        const target: CharacterTreeDecision | null = this.root.findNode(
            (node) =>
                node.name === className &&
                node.nodeType === CharacterTreeNodeType.DECISION &&
                (node as CharacterTreeDecision).type ===
                    CharacterPlannerStep.SECONDARY_CLASS,
        ) as CharacterTreeDecision | null;

        const original = this.findDecisionByType(
            CharacterPlannerStep.PRIMARY_CLASS,
        );

        if (!target || !original) {
            throw new Error('could not find classes to swap');
        }

        target.type = CharacterPlannerStep.PRIMARY_CLASS;
        original.type = CharacterPlannerStep.SECONDARY_CLASS;
    }

    getEquipment(): CharacterEquipment {
        const nodes = this.findAllDecisionsByType(
            CharacterPlannerStep.EQUIP_ITEM,
        ) as ICharacterTreeEquipmentItem[];

        return Object.fromEntries(
            nodes.map((node) => [node.equipmentSlot, node]),
        ) as Record<EquipmentSlot, ICharacterTreeEquipmentItem>;
    }

    equipItem(slot: EquipmentSlot, item: IEquipmentItem): Character {
        const equipment = this.getEquipment();

        const oldNode = equipment[slot];

        if (oldNode) {
            this.root.removeChild(oldNode);
        }

        const node = new CharacterTreeEquipmentItem(
            slot,
            EquipmentItemFactory.construct(item),
        );

        this.root.addChild(node);

        if (
            slot === EquipmentSlot.MeleeMainhand ||
            slot === EquipmentSlot.RangedMainhand
        ) {
            const offhandNode =
                equipment[
                    slot === EquipmentSlot.MeleeMainhand
                        ? EquipmentSlot.MeleeOffhand
                        : EquipmentSlot.RangedOffhand
                ];

            if (
                offhandNode &&
                (!this.canUseOffhand(slot) ||
                    (!this.canDualWield() &&
                        offhandNode.item.type !== EquipmentItemType.Shields))
            ) {
                this.root.removeChild(offhandNode);
            }
        }

        return this.clone();
    }

    // "Getters" for front end ================================================

    // eslint-disable-next-line class-methods-use-this
    canLevel(): boolean {
        return this.getTotalLevel() < Character.MAX_LEVEL;
    }

    private static findSubclassNode(
        classLevels: ICharacterTreeDecision[],
    ): CharacterTreeDecision | undefined {
        const children = classLevels.flatMap((cls) => cls.children ?? []);

        const subclass = children.find((node) => {
            if (node.nodeType !== CharacterTreeNodeType.DECISION) {
                return false;
            }

            const decision = node as CharacterTreeDecision;

            return decision.type === CharacterPlannerStep.CHOOSE_SUBCLASS;
        });

        return subclass as CharacterTreeDecision | undefined;
    }

    private static getClassLevelEffects(
        root: ICharacterTreeDecision,
    ): GrantableEffect[] {
        if (!root.children) {
            return [];
        }

        const childrenExcludingLevelUps: CharacterTreeNode[] =
            root.children.filter((child) => {
                if (child.nodeType !== CharacterTreeNodeType.DECISION) {
                    return true;
                }

                const decision = child as CharacterTreeDecision;

                return decision.type !== CharacterPlannerStep.LEVEL_UP;
            }) as CharacterTreeDecision[];

        const effects: GrantableEffect[] = childrenExcludingLevelUps.flatMap(
            (child) =>
                child.findAllNodes(
                    (node) => node.nodeType === CharacterTreeNodeType.EFFECT,
                ),
        ) as unknown as GrantableEffect[];

        return effects;
    }

    getClassInfo(): CharacterClassInfo[] {
        const allNodes = this.findAllDecisionsByType([
            CharacterPlannerStep.PRIMARY_CLASS,
            CharacterPlannerStep.SECONDARY_CLASS,
            CharacterPlannerStep.LEVEL_UP,
        ]).filter(Boolean) as ICharacterTreeDecision[];

        const levelNodes: Record<string, ICharacterTreeDecision[]> = {};

        allNodes.forEach((node) => {
            if (!levelNodes[node.name]) {
                levelNodes[node.name] = [];
            }

            levelNodes[node.name].push(node);
        });

        // sort by levels
        Object.values(levelNodes).forEach((nodes) =>
            nodes.sort((a: any, b: any) => a.level - b.level),
        );

        const info = Object.entries(levelNodes).map(([name, nodes]) => ({
            class: this.baseClassData.find((cls) => cls.name === name)!,
            subclass: Character.findSubclassNode(nodes),
            levels: nodes.map((node) => ({
                node: node as CharacterTreeDecision,
                totalEffects: Character.getClassLevelEffects(node),
            })),
        }));

        info.sort((a, b) => {
            // If one of the classes is the main class, prioritize it
            if (a.levels[0]!.node.type === CharacterPlannerStep.PRIMARY_CLASS) {
                return -1;
            }

            if (b.levels[0]!.node.type === CharacterPlannerStep.PRIMARY_CLASS) {
                return 1;
            }

            // For all other classes, sort by the number of levels in descending order
            return b.levels.length - a.levels.length;
        });

        return info;
    }

    getTotalLevel(): number {
        return this.getClassInfo().reduce(
            (acc, { levels }) => acc + levels.length,
            0,
        );
    }

    getTotalAbilityScores(): AbilityScores | null {
        const abilityFx = this.getPassives().filter(
            (effect) =>
                effect.subtype &&
                [
                    PassiveType.ABILITY_BASE,
                    PassiveType.ABILITY_RACIAL,
                    PassiveType.ABILITY_FEAT,
                ].includes(effect.subtype),
        );

        if (abilityFx.length === 0) {
            return null;
        }

        return Object.fromEntries(
            Object.keys(abilityFx[0].values).map((ability) => [
                ability,
                abilityFx.reduce(
                    (acc, effect) => acc + (effect.values?.[ability] ?? 0),
                    0,
                ),
            ]),
        ) as unknown as AbilityScores;
    }

    getGrantedEffects(): GrantableEffect[] {
        return this.root.findAllNodes(
            (node) => node.nodeType === CharacterTreeNodeType.EFFECT,
        ) as CharacterTreeEffect[] as GrantableEffect[];
    }

    getProficiencies(): Proficiency[] {
        // TODO: remove duplicates in a graceful way
        return this.getGrantedEffects().filter(
            (effect) => effect.type === GrantableEffectType.PROFICIENCY,
        ) as Proficiency[];
    }

    getActions(): IActionEffect[] {
        return this.getGrantedEffects().filter(
            (effect) => effect.type === GrantableEffectType.ACTION,
        ) as IActionEffect[];
    }

    getPassives(): IPassive[] {
        return this.getGrantedEffects().filter(
            (effect) => effect.type === GrantableEffectType.PASSIVE,
        ) as IPassive[];
    }

    getFeats(): CharacterTreeDecision[] {
        return this.findAllDecisionsByType(CharacterPlannerStep.FEAT);
    }

    static getFeatAsEffect(featNode: CharacterTreeDecision): GrantableEffect {
        safeAssert(featNode.type === CharacterPlannerStep.FEAT);

        const { name, description, image } = featNode;

        const featEffect = featNode.findNode(
            (effect) =>
                effect.nodeType === CharacterTreeNodeType.EFFECT &&
                effect.name === name &&
                (effect as CharacterTreeEffect).type ===
                    GrantableEffectType.PASSIVE,
        ) as CharacterTreeEffect | undefined as GrantableEffect | undefined;

        if (featEffect) {
            return featEffect;
        }

        const featDummyEffect: GrantableEffect = {
            name,
            description,
            image,
            type: GrantableEffectType.PASSIVE, // FIXME
        };

        return featDummyEffect;
    }

    getFeatsAsEffects(): GrantableEffect[] {
        const featOptions = this.getFeats();

        const effects = featOptions.map((option) => {
            if (option.name === 'Ability Improvement') {
                // Return the actual passive, with the custom name, instead
                const passive = option.children?.[0].children?.[0] as
                    | GrantableEffect
                    | undefined;

                if (passive) {
                    return passive;
                }
            }

            return Character.getFeatAsEffect(option);
        });

        return effects;
    }

    private static findNodeByType(
        type: CharacterPlannerStep | CharacterPlannerStep[],
    ): (node: ICharacterTreeNode) => boolean {
        return (node: ICharacterTreeNode) => {
            if (node.nodeType !== CharacterTreeNodeType.DECISION) {
                return false;
            }

            const decision = node as CharacterTreeDecision;

            return (
                typeof decision.type !== 'undefined' &&
                (typeof type === 'number'
                    ? decision.type === type
                    : type.includes(decision.type))
            );
        };
    }

    private findDecisionByType(
        type: CharacterPlannerStep | CharacterPlannerStep[],
    ): CharacterTreeDecision | null {
        return this.root.findNode(
            Character.findNodeByType(type),
        ) as CharacterTreeDecision | null;
    }

    private findAllDecisionsByType(
        type: CharacterPlannerStep | CharacterPlannerStep[],
    ): CharacterTreeDecision[] {
        return this.root.findAllNodes(
            Character.findNodeByType(type),
        ) as CharacterTreeDecision[];
    }

    private findNodeParent(child: CharacterTreeDecision | CharacterTreeEffect) {
        return this.root.findNode(
            (node) => node.children?.includes(child) ?? false,
        );
    }

    getRace(): ICharacterTreeDecision | undefined {
        return (
            this.findDecisionByType(CharacterPlannerStep.SET_RACE) ?? undefined
        );
    }

    getSubrace(): ICharacterTreeDecision | undefined {
        return (
            this.findDecisionByType(CharacterPlannerStep.CHOOSE_SUBRACE) ??
            undefined
        );
    }

    getBackground(): ICharacterTreeDecision | undefined {
        return this.findDecisionByType(CharacterPlannerStep.SET_BACKGROUND) as
            | ICharacterTreeDecision
            | undefined;
    }

    getKnownSpells(
        type:
            | CharacterPlannerStep.LEARN_CANTRIPS
            | CharacterPlannerStep.LEARN_SPELLS,
    ): GrantableEffect[] {
        return this.findAllDecisionsByType(type).flatMap(
            (decision) => decision.children!,
        ) as GrantableEffect[];
    }

    canDualWield(): boolean {
        const equipment = this.getEquipment();
        const weaponNode = equipment[EquipmentSlot.MeleeMainhand];
        const weapon = weaponNode?.item as WeaponItem | undefined;

        return !weapon || this.getDualWieldFilter()(weapon);
    }

    canUseOffhand(
        slot: EquipmentSlot.MeleeMainhand | EquipmentSlot.RangedMainhand,
    ): boolean {
        const equipment = this.getEquipment();
        const weaponNode = equipment[slot];
        const weapon = weaponNode?.item as WeaponItem | undefined;

        return weapon?.handedness !== WeaponHandedness['two-handed'];
    }

    getFeatByName(featName: string): CharacterTreeDecision | null {
        return this.root.findNode((node) => {
            if (node.nodeType !== CharacterTreeNodeType.DECISION) {
                return false;
            }

            const decision = node as CharacterTreeDecision;

            return (
                decision.type === CharacterPlannerStep.FEAT &&
                featName === decision.name
            );
        }) as CharacterTreeDecision | null;
    }

    private getDualWieldFilter(): (weapon: IWeaponItem) => boolean {
        if (this.getFeatByName('Dual Wielder')) {
            return (weapon: IWeaponItem) => !weapon.cantDualWield;
        }

        return (weapon: IWeaponItem) => weapon.light && !weapon.cantDualWield;
    }

    getEquipmentSlotFilters(): Record<
        number,
        (item: IEquipmentItem) => boolean
    > {
        const dwFilter = this.getDualWieldFilter();
        const canDwMelee = this.canDualWield();

        return {
            [EquipmentSlot.MeleeOffhand]: (item: IEquipmentItem) =>
                item.type === EquipmentItemType.Shields ||
                (canDwMelee && dwFilter(item as IWeaponItem)),
            [EquipmentSlot.RangedOffhand]: (item) =>
                dwFilter(item as IWeaponItem),
        };
    }

    getEquipmentSlotDisableStatus(): Record<number, boolean> {
        return {
            [EquipmentSlot.MeleeOffhand]: !this.canUseOffhand(
                EquipmentSlot.MeleeMainhand,
            ),
            [EquipmentSlot.RangedOffhand]: !this.canUseOffhand(
                EquipmentSlot.RangedMainhand,
            ),
        };
    }

    // Import / Export ========================================================

    canExport(): boolean {
        return (
            this.pendingSteps.length === 0 &&
            (this.pendingDecisions.length === 0 ||
                (this.pendingDecisions.length === 1 &&
                    this.pendingDecisions[0].type ===
                        CharacterPlannerStep.MANAGE_LEVELS))
        );
    }

    async export(validate?: boolean): Promise<string> {
        return TreeCompressor.deflate(this.root, validate);
    }

    static async import(
        importStr: string,
        classData: CharacterClassOption[],
        spellData: ISpell[],
    ): Promise<Character> {
        const root = await TreeCompressor.inflate(importStr);
        const char = new Character(classData, spellData);
        char.pendingDecisions.length = 0;
        char.pendingSteps.length = 0;
        char.root = CharacterTreeNode.fromJSON(root) as CharacterTreeRoot;

        return char;
    }
}
