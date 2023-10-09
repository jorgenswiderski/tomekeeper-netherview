// character-planner.tsx
import styled from 'styled-components';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BeatLoader } from 'react-spinners';
import Typography from '@mui/material/Typography';
import { Character } from '../../models/character/character';
import {
    CharacterDecision,
    CharacterDecisionInfo,
    DecisionStateInfo,
} from '../../models/character/character-states';
import { CharacterEvents } from '../../models/character/types';
import CharacterDisplay from './character-display';
import { ICharacterFeatureCustomizationOption } from './feature-picker/types';
import FeaturePicker from './feature-picker/feature-picker';

const Container = styled.div`
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    gap: 40px;
    background-color: #1a1a1a; // Darker background for the main container
`;

const ResetButton = styled.button`
    position: absolute;
    top: 10px;
    right: 10px;
    padding: 5px 15px;
    border: none;
    border-radius: 5px;
    background-color: #555; // Dark background for the button
    color: #e0e0e0; // Light gray for text
    cursor: pointer;

    &:hover {
        background-color: #777; // Slightly lighter on hover
    }
`;

const PanelContainer = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    margin: 40px 0px;
    width: 45%;
    max-width: 600px;
    height: 100%;
    border: 2px solid #8a8a8a; // Light gray for border
    border-radius: 8px;
    padding: 20px;
    background-color: #2a2a2a; // Base dark gray
`;

export default function CharacterPlanner() {
    const [character, setCharacter] = useState(new Character());
    const [loading, setLoading] = useState(false);
    const nextDecision = useMemo(() => character.nextDecision(), [character]);
    const nextDecisionInfo = useMemo(
        () => (nextDecision ? CharacterDecisionInfo[nextDecision.type] : null),
        [nextDecision],
    );

    const loadChoices = async (
        decision: CharacterDecision,
        decisionInfo: DecisionStateInfo,
    ) => {
        if (
            decision &&
            !decision.choices &&
            decisionInfo &&
            decisionInfo.getChoices
        ) {
            setLoading(true);
            const gc = decisionInfo.getChoices as () => Promise<
                ICharacterFeatureCustomizationOption[][]
            >;

            const choices = (await gc()) ?? undefined;

            // Preload the images for the choices
            choices?.forEach((choiceArray) =>
                choiceArray.forEach((choice) => {
                    if (choice.image) {
                        new Image().src = choice.image;
                    }
                }),
            );

            setCharacter((prevCharacter) => {
                const updatedCharacter = prevCharacter.clone();
                const updatedDecision = updatedCharacter.decisionQueue.find(
                    (cd) => cd.type === decision.type,
                );

                if (updatedDecision) {
                    updatedDecision.choices = choices;
                }

                return updatedCharacter;
            });

            setLoading(false);
        }
    };

    useEffect(() => {
        if (nextDecision && nextDecisionInfo) {
            loadChoices(nextDecision, nextDecisionInfo);
        }
    }, [nextDecision, nextDecisionInfo]);

    useEffect(() => {
        const secondDecision = character.decisionQueue[1];

        if (secondDecision) {
            loadChoices(
                secondDecision,
                CharacterDecisionInfo[secondDecision.type],
            );
        }
    }, [character.decisionQueue[1]]);

    const handleEvent = useCallback((event: CharacterEvents, values: any) => {
        setCharacter((prevCharacter) => prevCharacter.onEvent(event, values));
    }, []);

    const handleReset = () => {
        setCharacter(new Character()); // Reset the character to its initial state
    };

    return (
        <>
            <ResetButton onClick={handleReset}>Reset</ResetButton>
            <Container>
                {nextDecision &&
                    nextDecisionInfo &&
                    (loading || typeof nextDecision.choices === 'undefined' ? (
                        <BeatLoader />
                    ) : (
                        <PanelContainer>
                            <Typography variant="h4" gutterBottom>
                                {nextDecisionInfo.title}
                            </Typography>
                            {nextDecisionInfo.render
                                ? nextDecisionInfo.render({
                                      onEvent: handleEvent,
                                  })
                                : nextDecision.choices.map((choice) => (
                                      <FeaturePicker
                                          choices={choice}
                                          onEvent={handleEvent}
                                          event={nextDecision.type}
                                      />
                                  ))}
                        </PanelContainer>
                    ))}
                {character.race && character.levels.length > 0 && (
                    <PanelContainer>
                        <CharacterDisplay character={character} />
                    </PanelContainer>
                )}
            </Container>
        </>
    );
}
