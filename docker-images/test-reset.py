#!/usr/bin/env python3
"""Test script to debug /reset endpoint behavior."""

import sys
import asyncio
import logging

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

sys.path.insert(0, '/app')

async def test_reset():
    try:
        logger.info("Importing OpenRAEnvironment...")
        from openra_env.server.openra_environment import OpenRAEnvironment

        logger.info("Initializing environment...")
        env = OpenRAEnvironment()

        logger.info("Calling reset()...")
        observation = await env.reset()

        logger.info(f"Reset successful! Observation type: {type(observation)}")
        logger.info(f"Keys: {observation.keys() if hasattr(observation, 'keys') else 'N/A'}")
        return observation
    except Exception as e:
        logger.error(f"Error during reset: {e}", exc_info=True)
        import traceback
        traceback.print_exc()
        return None

if __name__ == "__main__":
    result = asyncio.run(test_reset())
    if result:
        print("SUCCESS")
        sys.exit(0)
    else:
        print("FAILED")
        sys.exit(1)
