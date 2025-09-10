import React from 'react';
import { Block, Elem } from '@humansignal/ui';

export const ProgressIndicator = ({ steps, currentStep, onStepClick, progress }) => {
  return (
    <Block name="progress-indicator">
      <Elem name="progress-bar">
        <Elem 
          name="progress-fill" 
          style={{ width: `${progress}%` }}
        />
      </Elem>
      
      <Elem name="steps">
        {steps.map((step, index) => {
          const isActive = index === currentStep;
          const isCompleted = index < currentStep;
          const isClickable = index <= currentStep;
          
          return (
            <Elem
              key={index}
              name="step"
              mod={{
                active: isActive,
                completed: isCompleted,
                clickable: isClickable
              }}
              onClick={() => isClickable && onStepClick(index)}
            >
              <Elem name="step-number">
                {isCompleted ? '✓' : index + 1}
              </Elem>
              <Elem name="step-info">
                <Elem name="step-title">{step.title}</Elem>
                <Elem name="step-description">{step.description}</Elem>
              </Elem>
            </Elem>
          );
        })}
      </Elem>
    </Block>
  );
};

ProgressIndicator.displayName = 'ProgressIndicator';