import { parse } from '../template/parser';

// -----------------------------------------------------------------------------

describe('@randlabs/createissue-action', () => {
	it('template parser', () => {
		const res = parse(`key1: value 1
key2: 'quoted value 2    '
key3: "    quoted value 3"
This is a body example
line 2 of body
`);

		expect(res.headers.key1).toBe('value 1');
		expect(res.headers.key2).toBe('quoted value 2    ');
		expect(res.headers.key3).toBe('    quoted value 3');
		expect(res.body).toBe('This is a body example\nline 2 of body\n');
	})
})
